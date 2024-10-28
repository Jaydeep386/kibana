/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { ENTITY_LATEST, entitiesAliasPattern } from '@kbn/entities-schema';
import {
  ENTITY_DEFINITION_ID,
  ENTITY_DISPLAY_NAME,
  ENTITY_ID,
  ENTITY_IDENTITY_FIELDS,
  ENTITY_LAST_SEEN,
  ENTITY_TYPE,
} from '@kbn/observability-shared-plugin/common';
import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

export const entityColumnIdsRt = t.union([
  t.literal(ENTITY_DISPLAY_NAME),
  t.literal(ENTITY_LAST_SEEN),
  t.literal(ENTITY_TYPE),
  t.literal('alertsCount'),
]);

export type EntityColumnIds = t.TypeOf<typeof entityColumnIdsRt>;

export const defaultEntitySortField: EntityColumnIds = 'alertsCount';

export const MAX_NUMBER_OF_ENTITIES = 500;

export const ENTITIES_LATEST_ALIAS = entitiesAliasPattern({
  type: '*',
  dataset: ENTITY_LATEST,
});

const entityArrayRt = t.array(t.string);
export const entityTypesRt = new t.Type<string[], string, unknown>(
  'entityTypesRt',
  entityArrayRt.is,
  (input, context) => {
    if (typeof input === 'string') {
      const arr = input.split(',');
      const validation = entityArrayRt.decode(arr);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    } else if (Array.isArray(input)) {
      const validation = entityArrayRt.decode(input);
      if (isRight(validation)) {
        return t.success(validation.right);
      }
    }

    return t.failure(input, context);
  },
  (arr) => arr.join()
);

export interface Entity {
  [ENTITY_LAST_SEEN]: string;
  [ENTITY_ID]: string;
  [ENTITY_TYPE]: string;
  [ENTITY_DISPLAY_NAME]: string;
  [ENTITY_DEFINITION_ID]: string;
  [ENTITY_IDENTITY_FIELDS]: string | string[];
  alertsCount?: number;
  [key: string]: any;
}
