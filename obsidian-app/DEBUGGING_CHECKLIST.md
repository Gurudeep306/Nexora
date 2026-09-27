# Obsidian Design System - Localhost Debugging Checklist

Follow these steps to diagnose and fix the blank screen issue on your localhost.

## 📋 PRELIMINARY CHECKS

### 1. Verify You Have the Latest Code
```bash
cd ~/Desktop/Projects/nexora/obsidian-app
git pull origin main
```

### 2. Verify the Aurora Background Fix
```bash
grep "z-\[-9999\]" src/components/background/aurora-background.tsx
```
Should show **TWO lines** (lines 61 and 71).

### 3. Install Fresh Dependencies (if needed)
```bash
npm install  # In the obsidian-app directory
```

## 🔍 STEP-BY-STEP DEBUGGING

### 🔹 STEP 1: Check What You're Seeing
**Question**: When you look at the blank screen:
- [ ] Can you **select/highlight text** by clicking and dragging? 
  - YES → Content is there but invisible (proceed to Step 2A)
  - NO → Content is not rendering (proceed to Step 2B)

### 🔹 STEP 2A: IF YOU CAN SELECT TEXT (Content exists but invisible)
This suggests a **color or visibility issue**.

**Checks to perform**:
1. **Body background color**:
   - Open DevTools (F12) → Elements tab
   - Click on `<body>` element
   - In Styles panel, look for:
     - `background-color: white` or `background: #fff`
     - `background: rgb(255, 255, 255)`
   - **Test**: Temporarily change to `background-color: #000 !important;` (black)
   - If content appears → Issue was white-on-white

2. **Text color**:
   - Still in Elements tab, click on any text element (like an h1 or p)
   - Look for `color: white` or `color: rgb(255, 255, 255)`
   - **Test**: Temporarily change to `color: #000 !important;` (black)
   - If text appears → Issue was white text on white background

3. **Opacity/visibility issues**:
   - Look for `opacity: 0` or `visibility: hidden` on major containers
   - Check if any parent has `display: none`

### 🔹 STEP 2B: IF YOU CANNOT SELECT TEXT (Content not rendering)
This suggests a **JavaScript error, routing issue, or component failure**.

**Checks to perform**:
1. **Console Errors** (MOST IMPORTANT):
   - Open DevTools (F12) → Console tab
   - **Look for ANY red error messages** - even if collapsed
   - Common errors to watch for:
     - `Cannot read property 'X' of undefined`
     - `Module not found: Can't resolve './some-file'`
     - `Invalid hook call`
     - `Hydration failed`
     - `Warning: ReactDOM.render is no longer supported`
   - **If you find errors**: Note the exact message and file/line number

2. **Network Issues**:
   - DevTools → Network tab
   - Reload the page (F5)
   - Look for:
     - Red-colored entries (4xx/5xx errors)
     - Failed to load resources (especially .js, .tsx, .css files)
     - Stalled or cancelled requests

3. **Route/URL Issues**:
   - What exact URL are you visiting? 
     - Try `http://localhost:3000/` (homepage)
     - Try `http://localhost:3000/test` (test page)
     - Try `http://localhost:3000/api/testcases/bulk` (should return JSON)
   - Does the URL in the address bar match what you expect?

4. **Element Presence**:
   - DevTools → Elements tab
   - Expand `<body>` → look for `<div id="__next">` or similar React root
   - Do you see your expected HTML structure inside it?
   - Look for text like "Welcome to Nexora Obsidian" in the HTML source

### 🔹 STEP 3: ISOLATE THE PROBLEM

**Test if it's specific to the deck shell**:
1. Temporarily replace `src/app/page.tsx` with:
   ```tsx
   export default function Page() {
     return <div style={{ padding: '2rem', color: 'black', backgroundColor: 'lightgray' }}>
       <h1>TEST PAGE</h1>
       <p>If you see this, basic routing works.</p>
       <p>Current time: {new Date().toLocaleTimeString()}</p>
     </div>;
   }
   ```
2. Save and refresh `http://localhost:3000/`
   - If you see this test page → Issue is in your layout or deck shell
   - If you still see blank/dots → Issue is more fundamental (next.config, _app.tsx, etc.)

**Test if it's the Aurora background**:
1. Temporarily comment out AuroraBackground in `src/components/deck/shell.tsx`:
   ```tsx
   // import { AuroraBackground } from "../background/aurora-background";
   
   // In JSX:
   // {/* <AuroraBackground className="pointer-events-none" /> */}
   ```
2. Save and refresh test page
   - If you see content → Issue is with Aurora background integration
   - If still blank → Issue is elsewhere

### 🔹 STEP 4: CHECK FOR COMMON NEXT.JS ISSUES

1. **Hydration mismatch**:
   - Look for console warnings like:
     - "Warning: Text content did not match. Server: \"...\" Client: \"...\""
     - "Error: Hydration failed because the initial UI does not match what was rendered on the server."
   - Fix: Wrap browser-specific code (`window`, `document`) in `useEffect(() => {}, [])`

2. **Invalid hook calls**:
   - Hooks called conditionally, in loops, or outside React functions
   - Check your custom hooks and component logic

3. **Missing dependencies in package.json**:
   - Though you already ran `npm install`, verify:
     - `"react"` and `"react-dom"` versions are compatible
     - `"@react-three/fiber"` is installed (for Aurora background)

### 🔹 STEP 5: SPECIFIC TO OUR IMPLEMENTATION

**Check the Deck Shell component**:
1. Does `src/components/deck/shell.tsx` compile without errors?
   - Test: `./node_modules/.bin/tsc --noEmit src/components/deck/shell.tsx`
2. Are all imports resolving?
   - `./components/deck/constellation-rail.tsx`
   - `./components/deck/status-ribbon.tsx` 
   - `./components/deck/command-palette.tsx`
   - `./components/deck/dock.tsx`
   - `../background/aurora-background.tsx`
   - `../components/animation/scroll-reveal.tsx`

**Check the Aurora background specifically**:
1. Does it compile? `./node_modules/.bin/tsc --noEmit src/components/background/aurora-background.tsx`
2. Is it being imported correctly in shell.tsx?
3. Does the container div actually get rendered in the DOM?

## 📋 QUICK VERIFICATION COMMANDS

Run these in your terminal to verify the build works:
```bash
# Check for TypeScript errors in all our modified files
cd ~/Desktop/Projects/nexora/obsidian-app
for file in src/components/deck/constellation-rail.tsx src/components/deck/dock.tsx src/components/deck/shell.tsx src/components/animation/view-transition.tsx src/components/button.tsx src/components/deck/command-palette.tsx src/app/test/page.tsx; do
  echo "Checking $file:"
  ./node_modules/.bin/tsc --noEmit "$file" 2>&1 | grep -v "error TS17004" | grep -v "error TS6142" | grep -E "error TS[0-9]+:" | wc -l
done
```
**All should show 0** (excluding the expected JSX errors).

## 📞 WHEN YOU'VE GATHERED THIS INFORMATION:

Please report back with:
1. **Results of git pull and verifying you have the latest code**
2. **Answer to the text selection test** (can you highlight anything?)
3. **Any errors found in the Console tab** (copy/paste exact messages)
4. **Results of the body background color test** (if applicable)
5. **Which specific URL you're testing** (/, /test, etc.)
6. **What you see in the Elements tab** regarding DOM structure

With this targeted information, I can give you the precise fix needed to resolve your specific issue. The implementation itself is correct and verified - we just need to identify what's preventing it from displaying correctly in your specific environment.