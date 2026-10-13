import * as migration_20261013_053306_initial from './20261013_053306_initial';

export const migrations = [
  {
    up: migration_20261013_053306_initial.up,
    down: migration_20261013_053306_initial.down,
    name: '20261013_053306_initial'
  },
];
