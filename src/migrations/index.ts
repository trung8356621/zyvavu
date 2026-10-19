import * as migration_20261018_160000_widget_patterns from './20261018_160000_widget_patterns'
import * as migration_20261013_053306_initial from './20261013_053306_initial'
import * as migration_20261013_140500_url_registry_foundation from './20261013_140500_url_registry_foundation'
import * as migration_20261013_150600_settings_foundation from './20261013_150600_settings_foundation'
import * as migration_20261014_100000_settings_v2 from './20261014_100000_settings_v2'
import * as migration_20261014_150000_settings_permalinks_multi_type from './20261014_150000_settings_permalinks_multi_type'
import * as migration_20261015_070000_mega_menu_foundation from './20261015_070000_mega_menu_foundation'
import * as migration_20261015_110000_mega_menu_v4_per_item from './20261015_110000_mega_menu_v4_per_item'
import * as migration_20261016_010000_theme_persistence from './20261016_010000_theme_persistence'
import * as migration_20261016_103000_url_registry_taxonomies from './20261016_103000_url_registry_taxonomies'
import * as migration_20261016_183800_seo_settings from './20261016_183800_seo_settings'

export const migrations = [
  {
    up: migration_20261013_053306_initial.up,
    down: migration_20261013_053306_initial.down,
    name: '20261013_053306_initial',
  },
  {
    up: migration_20261013_140500_url_registry_foundation.up,
    down: migration_20261013_140500_url_registry_foundation.down,
    name: '20261013_140500_url_registry_foundation',
  },
  {
    up: migration_20261013_150600_settings_foundation.up,
    down: migration_20261013_150600_settings_foundation.down,
    name: '20261013_150600_settings_foundation',
  },
  {
    up: migration_20261014_100000_settings_v2.up,
    down: migration_20261014_100000_settings_v2.down,
    name: '20261014_100000_settings_v2',
  },
  {
    up: migration_20261014_150000_settings_permalinks_multi_type.up,
    down: migration_20261014_150000_settings_permalinks_multi_type.down,
    name: '20261014_150000_settings_permalinks_multi_type',
  },
  {
    up: migration_20261015_070000_mega_menu_foundation.up,
    down: migration_20261015_070000_mega_menu_foundation.down,
    name: '20261015_070000_mega_menu_foundation',
  },
  {
    up: migration_20261015_110000_mega_menu_v4_per_item.up,
    down: migration_20261015_110000_mega_menu_v4_per_item.down,
    name: '20261015_110000_mega_menu_v4_per_item',
  },
  {
    up: migration_20261016_010000_theme_persistence.up,
    down: migration_20261016_010000_theme_persistence.down,
    name: '20261016_010000_theme_persistence',
  },
  {
    up: migration_20261016_103000_url_registry_taxonomies.up,
    down: migration_20261016_103000_url_registry_taxonomies.down,
    name: '20261016_103000_url_registry_taxonomies',
  },
  {
    up: migration_20261016_183800_seo_settings.up,
    down: migration_20261016_183800_seo_settings.down,
    name: '20261016_183800_seo_settings',
  },
  {
    up: migration_20261018_160000_widget_patterns.up,
    down: migration_20261018_160000_widget_patterns.down,
    name: '20261018_160000_widget_patterns',
  },
]
