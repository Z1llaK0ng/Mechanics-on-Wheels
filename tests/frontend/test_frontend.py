import asyncio
from playwright.async_api import async_playwright

async def run():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context()
        page = await context.new_page()
        
        # Log all console messages
        page.on("console", lambda msg: print(f"CONSOLE: {msg.text}"))
        
        # Monitor all responses and print if 401
        async def handle_response(response):
            if response.status == 401:
                print(f"401 ERROR on: {response.url}")
        page.on("response", handle_response)
        
        print("Navigating to login...")
        await page.goto("http://localhost:5173/shop/login")
        
        # Toggle role
        await page.click("button:has-text('Shop Staff')")
        
        # Fill form
        await page.fill("input#shop-id-field", "69b4484c00018b9c508d") # The ID of Chem1c
        await page.fill("input#shop-email", "bob@chem1c.com") # Using Bob from previous DB snapshot
        await page.fill("input#shop-password", "password123")
        
        print("Logging in...")
        await page.click("button[type='submit']")
        
        # Wait for navigation to complete
        await page.wait_for_load_state("networkidle")
        print(f"URL after login: {page.url}")
        
        try:
            # Look for CRM tile
            print("Clicking CRM tile...")
            await page.click("button:has-text('CRM')", timeout=5000)
            await page.wait_for_load_state("networkidle")
            print(f"URL after click: {page.url}")
            
            # Wait 2 seconds to see if anything redirects
            await asyncio.sleep(2)
            print(f"Final URL: {page.url}")
            
        except Exception as e:
            print(f"Error during interaction: {e}")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(run())
