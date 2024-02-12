/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import type {
  PatchListItemSchema,
  CreateListItemSchema,
  ListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { LIST_URL, LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { getListItemResponseMockWithoutAutoGeneratedValues } from '@kbn/lists-plugin/common/schemas/response/list_item_schema.mock';
import { getCreateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_item_schema.mock';
import { getCreateMinimalListSchemaMock } from '@kbn/lists-plugin/common/schemas/request/create_list_schema.mock';
import { getUpdateMinimalListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/request/update_list_item_schema.mock';

import {
  createListsIndex,
  deleteListsIndex,
  removeListItemServerGeneratedProperties,
} from '../../../utils';
import { FtrProviderContext } from '../../../../../ftr_provider_context';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const log = getService('log');
  const retry = getService('retry');
  const config = getService('config');
  const ELASTICSEARCH_USERNAME = config.get('servers.kibana.username');

  describe('@ess @serverless patch_list_items', () => {
    describe('patch list items', () => {
      beforeEach(async () => {
        await createListsIndex(supertest, log);
      });

      afterEach(async () => {
        await deleteListsIndex(supertest, log);
      });

      it('should patch a single list item property of value using an id', async () => {
        const listItemId = getCreateMinimalListItemSchemaMock().id as string;
        // create a simple list
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a simple list item
        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        // patch a simple list item's value
        const patchListItemPayload: PatchListItemSchema = {
          id: listItemId,
          value: '192.168.0.2',
        };

        const { body } = await supertest
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload);

        const outputListItem: Partial<ListItemSchema> = {
          ...getListItemResponseMockWithoutAutoGeneratedValues(ELASTICSEARCH_USERNAME),
          value: '192.168.0.2',
        };
        const bodyToCompare = removeListItemServerGeneratedProperties(body);
        expect(bodyToCompare).to.eql(outputListItem);

        await retry.waitFor('updates should be persistent', async () => {
          const { body: listItemBody } = await supertest
            .get(LIST_ITEM_URL)
            .query({ id: getCreateMinimalListItemSchemaMock().id })
            .set('kbn-xsrf', 'true');

          expect(removeListItemServerGeneratedProperties(listItemBody)).to.eql(outputListItem);
          return true;
        });
      });

      it('should patch a single list item of value using an auto-generated id of both list and list item', async () => {
        const { id, ...listNoId } = getCreateMinimalListSchemaMock();
        // create a simple list with no id which will use an auto-generated id
        const { body: createListBody } = await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(listNoId)
          .expect(200);

        // create a simple list item also with an auto-generated id using the list's auto-generated id
        const listItem: CreateListItemSchema = {
          ...getCreateMinimalListItemSchemaMock(),
          list_id: createListBody.id,
        };
        const { body: createListItemBody } = await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(listItem)
          .expect(200);

        // patch a simple list item's value
        const patchListItemPayload: PatchListItemSchema = {
          id: createListItemBody.id,
          value: '192.168.0.2',
        };

        const { body } = await supertest
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload)
          .expect(200);

        const outputListItem: Partial<ListItemSchema> = {
          ...getListItemResponseMockWithoutAutoGeneratedValues(ELASTICSEARCH_USERNAME),
          value: '192.168.0.2',
        };
        const bodyToCompare = {
          ...removeListItemServerGeneratedProperties(body),
          list_id: outputListItem.list_id,
        };
        expect(bodyToCompare).to.eql(outputListItem);

        await retry.waitFor('updates should be persistent', async () => {
          const { body: listItemBody } = await supertest
            .get(LIST_ITEM_URL)
            .query({ id: createListItemBody.id })
            .set('kbn-xsrf', 'true');
          const listItemBodyToCompare = {
            ...removeListItemServerGeneratedProperties(listItemBody),
            list_id: outputListItem.list_id,
          };
          expect(listItemBodyToCompare).to.eql(outputListItem);
          return true;
        });
      });

      it('should not remove unspecified in patch payload meta property', async () => {
        const listItemId = getCreateMinimalListItemSchemaMock().id as string;
        // create a simple list
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a simple list item
        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send({ ...getCreateMinimalListItemSchemaMock(), meta: { test: true } })
          .expect(200);

        // patch a simple list item's value
        const patchListItemPayload: PatchListItemSchema = {
          id: listItemId,
          value: '192.168.0.2',
        };

        const { body } = await supertest
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload);

        expect(body.meta).to.eql({ test: true });

        await retry.waitFor('updates should be persistent', async () => {
          const { body: listItemBody } = await supertest
            .get(LIST_ITEM_URL)
            .query({ id: getCreateMinimalListItemSchemaMock().id })
            .set('kbn-xsrf', 'true');

          expect(listItemBody.meta).to.eql({ test: true });
          return true;
        });
      });

      it('should give a 404 if it is given a fake id', async () => {
        // create a simple list
        await supertest
          .post(LIST_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListSchemaMock())
          .expect(200);

        // create a simple list item
        await supertest
          .post(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(getCreateMinimalListItemSchemaMock())
          .expect(200);

        // patch a simple list item's value
        const patchListItemPayload: PatchListItemSchema = {
          ...getUpdateMinimalListItemSchemaMock(),
          id: 'some-other-id',
          value: '192.168.0.2',
        };

        const { body } = await supertest
          .patch(LIST_ITEM_URL)
          .set('kbn-xsrf', 'true')
          .send(patchListItemPayload)
          .expect(404);

        expect(body).to.eql({
          status_code: 404,
          message: 'list item id: "some-other-id" not found',
        });
      });
    });
  });
};
