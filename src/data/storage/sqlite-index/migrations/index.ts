import type { Migration } from '../migrator'
import init from './0000_init.sql?raw'
import ftsAndTriggers from './0001_fts_and_triggers.sql?raw'
import ftsContentlessDelete from './0002_fts_contentless_delete.sql?raw'
import sourceFiles from './0003_source_files.sql?raw'
import libraryLogged from './0004_library_logged.sql?raw'
import wikilinks from './0005_wikilinks.sql?raw'
import taggingsEntityIndex from './0006_taggings_entity_index.sql?raw'
import blocks from './0007_blocks.sql?raw'

/** Ordered migration set. Names double as the identity recorded in `__migrations`. */
export const MIGRATIONS: readonly Migration[] = [
  { name: '0000_init', sql: init },
  { name: '0001_fts_and_triggers', sql: ftsAndTriggers },
  { name: '0002_fts_contentless_delete', sql: ftsContentlessDelete },
  { name: '0003_source_files', sql: sourceFiles },
  { name: '0004_library_logged', sql: libraryLogged },
  { name: '0005_wikilinks', sql: wikilinks },
  { name: '0006_taggings_entity_index', sql: taggingsEntityIndex },
  { name: '0007_blocks', sql: blocks },
]
