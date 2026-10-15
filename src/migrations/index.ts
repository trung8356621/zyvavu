import * as migration_20261013_053306_initial from './20261013_053306_initial';
import * as migration_20261013_140500_url_registry_foundation from './20261013_140500_url_registry_foundation';
import * as migration_20261013_150600_settings_foundation from './20261013_150600_settings_foundation';
import * as migration_20261014_100000_settings_v2 from './20261014_100000_settings_v2';
import * as migration_20261014_150000_settings_permalinks_multi_type from './20261014_150000_settings_permalinks_multi_type';
import * as migration_20261015_070000_mega_menu_foundation from './20261015_070000_mega_menu_foundation';
import * as migration_20261015_110000_mega_menu_v4_per_item from './20261015_110000_mega_menu_v4_per_item';

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
  {
    up: migration_20261013_150600_settings_foundation.up,
    down: migration_20261013_150600_settings_foundation.down,
    name: '20261013_150600_settings_foundation'
  },
  {
    up: migration_20261014_100000_settings_v2.up,
    down: migration_20261014_100000_settings_v2.down,
    name: '20261014_100000_settings_v2'
  },
  {
    up: migration_20261014_150000_settings_permalinks_multi_type.up,
    down: migration_20261014_150000_settings_permalinks_multi_type.down,
    name: '20261014_150000_settings_permalinks_multi_type'
  },
  {
    up: migration_20261015_070000_mega_menu_foundation.up,
    down: migration_20261015_070000_mega_menu_foundation.down,
    name: '20261015_070000_mega_menu_foundation'
  },
  {
    up: migration_20261015_110000_mega_menu_v4_per_item.up,
    down: migration_20261015_110000_mega_menu_v4_per_item.down,
    name: '20261015_110000_mega_menu_v4_per_item'
  },
];
