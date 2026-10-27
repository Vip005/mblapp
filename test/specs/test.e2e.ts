import { expect } from '@wdio/globals'

describe('FreshMart Mobile App', () => {
    it('should launch the FreshMart app successfully', async () => {
        const packageName = 'com.afss05steam.freshmart'

        // Verify the app is installed and running
        const currentPackage = await browser.execute('mobile: getCurrentPackage')

        expect(currentPackage).toBe(packageName)
    })
})