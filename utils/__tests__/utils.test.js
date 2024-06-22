import { isObject } from '../utils';

it('is object', () => {
  const obj = {};
  expect(isObject(obj)).toBe(true);
});