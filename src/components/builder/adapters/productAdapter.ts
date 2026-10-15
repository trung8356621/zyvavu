import type { CategoryQueryOptions, ProductDataSourceAdapter } from './types'
import type { ProductItemData } from '../templates/registry'

/**
 * Extensible Product Data Source Adapter Contract.
 * In Phase V1A, the Products collection is not yet installed in the Zyvavu CMS schema.
 * This adapter defines the integration contract for the future E-commerce / Product Catalog module.
 */
export class PendingProductDataSourceAdapter implements ProductDataSourceAdapter {
  async fetchProductsByCategory(options: CategoryQueryOptions): Promise<ProductItemData[]> {
    // Contractually explicit: Products module does not exist yet.
    // Do not fabricate fake products or claim functionality.
    throw new Error(
      'ProductCatalogProviderUnavailable: Products collection is pending future installation. ProductCategoryList cannot fetch live items.',
    )
  }
}

export const pendingProductAdapter = new PendingProductDataSourceAdapter()
