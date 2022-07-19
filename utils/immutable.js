/**
 * https://github.com/immutable-js/immutable-js/issues/1452#issuecomment-386162309
 * Immutable JS mergeDeep utility
 */

import { List } from 'immutable';

const isMergeable = (a) => (
  a && typeof a === 'object' && typeof a.mergeWith === 'function' && !List.isList(a)
);

export const mergeDeep = (a, b) => {
  // If b is null, it would overwrite a, even if a is mergeable
  if (isMergeable(a) && b !== null) {
      return a.mergeWith(mergeDeep, b);
  }

  if (!List.isList(a) || !List.isList(b)) {
      return b;
  }

  return b.reduce((acc, nextItem, index) => {
      const existingItem = acc.get(index);
      if (isMergeable(existingItem)) {
          return acc.set(index, existingItem.mergeWith(mergeDeep, nextItem));
      }

      return acc.set(index, nextItem);
  }, a);
};

export const mergeDeepOverwriteLists = (a, b) => {
  // If b is null, it would overwrite a, even if a is mergeable
  if (b === null) return b;

  if (isMergeable(a) && !List.isList(a)) {
      return a.mergeWith(mergeDeepOverwriteLists, b);
  }

  return b;
};