const puppeteer = require('puppeteer');
const path = require('path');

async function run() {
  const artifactDir = '/Users/gurudeep/.gemini/antigravity-ide/brain/f6b62e34-008e-4558-b9b6-af0c19df2c77';
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1100 });

    console.log('[*] Authenticating at http://127.0.0.1:5173/auth...');
    await page.goto('http://127.0.0.1:5173/auth', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 1000));

    try {
      const createTab = await page.locator('::-p-text(Create account)');
      if (createTab) await createTab.click();
      await new Promise((r) => setTimeout(r, 500));
      const u = 'gate_user_' + Math.floor(Math.random() * 900000 + 100000);
      await page.locator('input[autocomplete="username"]').fill(u);
      await page.locator('input[type="email"]').fill(u + '@gate.test');
      await page.locator('input[type="password"]').fill('NexoraMaster123!');
      await page.locator('button[type="submit"]').click();
      await new Promise((r) => setTimeout(r, 2000));
    } catch (e) {
      console.log('[!] Auth step note:', e.message);
    }

    // 1. GATE Question with Reconstructed Vector Schematic
    console.log('[*] Navigating to http://127.0.0.1:5173/gate?hasFigure=true...');
    await page.goto('http://127.0.0.1:5173/gate?hasFigure=true', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    const vectorDiagramPath = path.join(artifactDir, 'gate_reconstructed_vector_diagram.png');
    await page.screenshot({ path: vectorDiagramPath });
    console.log('[✓] Captured reconstructed vector diagram to', vectorDiagramPath);

    // 2. Open step-by-step solution on the vector question to view Live Interactive Visualizer + Handwritten Notebook
    console.log('[*] Opening Step-by-Step Solution & Tricks on Question with diagram...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Solution'));
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollBy(0, 450));
    await new Promise((r) => setTimeout(r, 800));

    const solPath = path.join(artifactDir, 'gate_deep_step_solution.png');
    await page.screenshot({ path: solPath });
    console.log('[✓] Captured deep step solution to', solPath);

    // 3. Test Computer Networks Sliding Window Visualizer
    console.log('[*] Testing networking question with sliding window visualizer (q=sliding+window)...');
    await page.goto('http://127.0.0.1:5173/gate?q=sliding+window', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Solution'));
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 800));

    const netAnimPath = path.join(artifactDir, 'gate_sliding_window_visualizer.png');
    await page.screenshot({ path: netAnimPath });
    console.log('[✓] Captured sliding window visualizer to', netAnimPath);

    // 4. Test Subnet Mask Calculator Visualizer
    console.log('[*] Testing subnet calculator visualizer (q=subnet)...');
    await page.goto('http://127.0.0.1:5173/gate?q=subnet', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Solution'));
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 800));

    const subnetAnimPath = path.join(artifactDir, 'gate_subnet_visualizer.png');
    await page.screenshot({ path: subnetAnimPath });
    console.log('[✓] Captured subnet visualizer to', subnetAnimPath);

    // 5. Test Linear Algebra Matrix / Eigenvalues Visualizer
    console.log('[*] Testing linear algebra matrix visualizer (q=eigenvalue)...');
    await page.goto('http://127.0.0.1:5173/gate?q=eigenvalue', { waitUntil: 'networkidle2', timeout: 30000 });
    await new Promise((r) => setTimeout(r, 2500));

    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const btn = btns.find((b) => b.textContent && b.textContent.includes('Solution'));
      if (btn) btn.click();
    });

    await new Promise((r) => setTimeout(r, 2000));
    await page.evaluate(() => window.scrollBy(0, 350));
    await new Promise((r) => setTimeout(r, 800));

    const matrixAnimPath = path.join(artifactDir, 'gate_matrix_visualizer.png');
    await page.screenshot({ path: matrixAnimPath });
    console.log('[✓] Captured matrix visualizer to', matrixAnimPath);

    console.log('[🎉] All visual verification screenshots captured successfully!');
  } catch (err) {
    console.error('[-] Error during screenshot capture:', err);
  } finally {
    await browser.close();
  }
}

run();
