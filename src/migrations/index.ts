import * as migration_20261013_053306_initial from './20261013_053306_initial';
import * as migration_20261013_140500_url_registry_foundation from './20261013_140500_url_registry_foundation';

export const migrations = [
  {
    up: migration_20261013_053306_initial.up,
    down: migration_20261013_053306_initial.down,
    name: '20261013_053306_initial'
  },
  {
    up: migration_20261013_140500_url_registry_foundation.up,
    down: migration_20261013_140500_url_registry_foundation.down,
    name: '20261013_140500_url_registry_foundation'
  },
];
