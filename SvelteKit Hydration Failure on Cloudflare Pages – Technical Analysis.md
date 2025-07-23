## Problem Overview

When deploying a SvelteKit app to Cloudflare Pages, the client-side **hydration step fails completely** despite successful server-side rendering (SSR). In this scenario:

- The HTML is rendered on the server and delivered correctly (the SSR content shows up).
    
- All static assets (JS/CSS) load with HTTP 200 responses.
    
- The SvelteKit bootstrap script (`kit.start()`) is included and **appears to execute** (no errors thrown).
    
- **However, nothing interactive happens:** no `window.__SVELTEKIT__` state is created, no `onMount` code runs, and no client-side navigation or event handlers work.
    
- There are **zero errors or logs** in the browser console, making the failure “silent”.
    

In short, the app remains stuck in its SSR-only state – e.g. loading spinners never disappear and internal links act like dead links.

## Most Probable Root Causes

This kind of silent hydration failure is unusual. Based on the evidence and similar reports, a few root causes are likely:

**1. Hydration Disabled by Configuration:** One common cause of “no client JS” in SvelteKit is inadvertently disabling client-side rendering (CSR) via a config flag. In SvelteKit, if a route or layout sets `export const csr = false` (or uses `csr = dev` which is false in production), then **no hydration script will run for those pages**. This is by design (for purely static pages). Several developers have hit this issue – the app works in dev but appears inert in production until they remove the `csr = dev` flag. **Action**: Double-check your `+layout.js` and `+page.js` files for any `export const csr` setting. If present and not intentionally needed, remove it to re-enable hydration. (The provided case’s config did not list a CSR flag, but this is a prime suspect to eliminate first.)

**2. SvelteKit Hydration Bug or Mismatch:** If configuration isn’t the issue, a subtle **framework bug or hydration mismatch** could be at play. SvelteKit’s hydration process can fail silently if the DOM markup doesn’t match what the client expects (e.g. mismatched text, missing elements). In development mode, Svelte would log a warning about a hydration mismatch, but in production it can fail without visible errors. For example, Svelte 5 had known hydration mismatch bugs (though in this case the app was downgraded to Svelte 4 with no change). It’s possible something in the SSR output is different from the client’s initial state, causing Svelte’s runtime to abort mounting. For instance, **Cloudflare’s environment might inject or alter HTML** in small ways (see cause #3 below) or an unhandled difference in data can prevent hydration. The symptom of `window.__SVELTEKIT__` remaining undefined suggests that `kit.start()` ran but **the app never fully mounted onto the DOM**. This points to an internal failure during Svelte’s `hydrate` routine – likely a silent exception or early return. Without console output, this is hard to confirm, but it aligns with a hydration process that “gave up” at the final step.

**3. Cloudflare Pages Environment Interference:** The Cloudflare Pages platform could be inadvertently interfering with the client script execution. While Cloudflare Pages should just serve static files (and run your SSR Worker), certain Cloudflare features can modify your HTML or scripts. For example, the **Email Address Obfuscation** feature will strip out plaintext emails from HTML and re-insert them via JavaScript, which famously caused hydration errors on custom domains. Cloudflare’s **Rocket Loader** (if enabled) might defer or rewrite script tags in ways SvelteKit doesn’t expect. Even though in this case we see the hydration script present, it’s worth checking if Cloudflare injected any additional scripts or altered the HTML. Diffing the page source between a local build and the deployed page is a good strategy. If you find Cloudflare-added code (for instance, a comment or script around your hydration script), try disabling that feature (e.g. via a Page Rule or setting). So far, there’s no direct evidence of such interference here, but given Cloudflare’s track record, **it can’t be ruled out**. Ensure that **Email Obfuscation, Rocket Loader, Automatic Minification,** and similar post-processing features are turned off for this Pages site as a precaution.

**4. Adapter-Cloudflare or Build Process Quirks:** Another angle is the SvelteKit Cloudflare adapter or the build output itself. The adapter-cloudflare primarily affects the server-side (generating the `_worker.js` for SSR). Since SSR is working (we see `x-sveltekit-page: true` headers), the adapter is _mostly_ doing its job. However, one possibility is that the adapter’s routing config or environment flags might trick SvelteKit’s client into thinking it’s in a non-browser context. Cloudflare Pages runs on a V8 isolate (Cloudflare Workers runtime) for SSR, which isn’t Node – SvelteKit might detect the platform differently. Notably, the Cloudflare Pages docs suggest setting `CF_PAGES=1` during build to help the adapter auto-detect the environment. If that wasn’t done (and you used `adapter-auto` at any point), it could cause mis-configuration. In our case, the adapter was explicitly `adapter-cloudflare`, so auto-detection shouldn’t be an issue. Still, ensure the build command is exactly as Cloudflare expects (the framework preset should handle this). Also consider the **Vite config and dependencies**: a user reported that a custom Vite config broke their SvelteKit app on Cloudflare – removing all custom Vite plugins fixed the hydration issue. This suggests that certain build optimizations or incompatible plugins can produce a client bundle that doesn’t execute under Cloudflare’s setup. If you have a complex `vite.config.js`, try simplifying it to the basics to see if that resolves the no-hydration problem.

**5. Cloudflare V8 Limitations or Timing Issues:** It’s worth mentioning that Cloudflare’s Workers runtime (which Pages Functions use) has some limitations (no traditional Node APIs, limited CPU time per request, etc.), but these mostly affect server-side code. The hydration issue is happening in the browser, after the page is delivered. One theory from the internal research is that **something about the Cloudflare environment causes the client-side JS to never run or complete**. For example, if the SSR response was streamed or chunked oddly, the script might execute at the wrong time or not at all – but modern browsers should handle the `<script>` tag properly once delivered. Another hypothesis was that the Cloudflare Worker might be consuming some global that the client expects. (However, since the client JS runs in the end-user’s browser, the Cloudflare isolate shouldn’t directly affect it beyond the content of the delivered files.) At this time, no specific V8 isolate API that SvelteKit hydration needs is known to be missing. We can likely rule out Cloudflare’s runtime itself as the culprit and focus on configuration and SvelteKit behavior.

## SvelteKit–Cloudflare Compatibility (Known Issues?)

Is this a known incompatibility between **SvelteKit (v2.10–2.15)** and Cloudflare Pages? Officially, SvelteKit is **intended to work on Cloudflare Pages** – the adapter-cloudflare exists for this reason, and Cloudflare’s docs even provide a guide (many users have deployed successfully). In practice, however, there have been **scattered reports of similar issues**:

- One developer found that deploying to Cloudflare Pages resulted in JavaScript not running on the home page with no errors, eerily similar to our case. In their case, an async `load` function causing a 500 error and a misused CSR flag were part of the problem. Once they removed the `export const csr = dev` and adjusted their data loading, the app became interactive. This suggests misconfiguration can manifest as total hydration failure on Cloudflare.
    
- Another user on StackOverflow observed that if they opened a SvelteKit page (built with adapter-static) directly via its URL (not through the index), **none of the JS ran** – exactly as if hydration was broken. It turned out, again, that `export const csr = dev` in their page was preventing hydration in production. This underscores how easily a configuration flag can mimic a “platform bug.”
    
- There haven’t been widespread bug reports on the SvelteKit issue tracker specifically about Cloudflare hydration no-ops (no open issue was found for SvelteKit 2.x and Cloudflare Pages as of mid-2025). This could mean the issue is something specific to this project or an edge case combination of SvelteKit features that hasn’t been hit often. It could also mean others have encountered it but assumed it was their own mistake and fixed it quietly (for example, by switching off certain features or moving to another platform).
    

In summary, **there is no officially documented incompatibility** between SvelteKit 2.12+ and Cloudflare Pages, but the evidence suggests there is a real issue occurring at this intersection. It may be a bug in SvelteKit’s client runtime that only surfaces under certain build/environments, or a Cloudflare quirk not yet recognized. The fact that you tested multiple SvelteKit versions (2.10 through 2.15) and even Svelte 5 vs 4 with no change hints that the problem is not a one-off regression in SvelteKit – it may be inherent to how SvelteKit hydrates on Cloudflare in general for this app.

## Why Hydration Is Failing (The Breakpoint in the Process)

Let’s pinpoint the exact step where things stop. The normal hydration sequence for SvelteKit is:

1. **Server renders HTML** (including placeholders and `data-svelte-h` hydration markers).
    
2. **Browser loads the page HTML** and encounters the SvelteKit initialization `<script>`.
    
3. That script sets up a global and dynamically imports the client bundles (`start.js` and `app.js`).
    
4. Once those modules are loaded, it calls `kit.start(app, element, {...})` to hydrate.
    
5. The SvelteKit runtime then **reconstructs the component tree on the client**, attaches event listeners, runs `onMount` lifecycle functions, and finally sets `window.__SVELTEKIT__` to mark hydration complete.
    

In our case, steps 1–4 are happening: the HTML is delivered and parsed, the `<script>` runs, modules import successfully (we even manually confirmed the modules export the expected functions), and `kit.start()` is invoked. The failure is at step 5 – **the app never actually hydrates the DOM**. Internally, `kit.start()` likely instantiates the root Svelte component with the SSR-provided DOM element (`element`) as the target. The fact that `onMount` never fires and the DOM remains unchanged means the Svelte component either **never mounted or immediately unmounted**.

Possible reasons for this include:

- An internal exception during mounting that got swallowed. (If Svelte encountered an error diffing the SSR DOM against the expected initial state, it might abort. In dev you’d see an error, but in prod it might silently fail or attempt to recover by doing nothing.)
    
- The hydration was somehow “no-oped.” If SvelteKit thought the page didn’t need hydration (e.g. if `csr` was false or if it thought the page was already hydrated), it might intentionally skip mounting. The presence of the script contradicts a deliberate skip – it was clearly intending to hydrate. But something like a leftover `data` mismatch could trigger an early exit. The `data: [null,null]` passed to `kit.start` indicates no server data was preloaded for the page (since your page uses purely client-side fetch in `onMount`). That shouldn’t be an issue; SvelteKit will hydrate with `undefined` data just fine. So, not likely the cause.
    
- A race condition or context issue: If `document.currentScript.parentElement` was not the correct container, hydration could mount to the wrong place or not at all. The markup shows the script is inside a `<div style="display: contents">` wrapper. That wrapper is the hydration target. If Cloudflare somehow altered that wrapper (for instance, removed the `display: contents` or changed where the script lives), the `element` variable might be incorrect. However, the page source shows it correctly in the `<div>`. Using a `display: contents`wrapper is a standard SvelteKit technique and normally fine. We don’t see evidence that this is failing, but it’s worth verifying the structure in the delivered HTML matches expectations.
    

Given all the above, the **most likely breakpoint** is that **Svelte’s runtime did start to hydrate and then encountered an unrecoverable condition**, causing it to silently stop. Since `window.__SVELTEKIT__` remains undefined and the UI doesn’t update, we know hydration never completed. If no error was logged, it might have been caught internally. (For instance, Svelte might catch hydration errors to avoid throwing in production – though one would expect at least an `console.error` in dev mode.) This is why a minimal reproduction (with dev mode logs) is critical – it may surface a warning or error that wasn’t visible in the optimized build.

## Have Others Hit This Recently?

Yes, there are signs that other developers have faced similar hydration problems on Cloudflare:

- In a Reddit discussion, a developer deploying to Cloudflare Pages noted that if they visited the index page first, everything was fine, but **if they landed on a subpage directly, the JS was completely non-functional** (no clicks, no console errors). Ultimately, the solution for them was to remove an `export const csr = dev` from their code, which immediately fixed the issue by allowing hydration on direct page loads. This matches the pattern of silent failure with Cloudflare Pages and underscores how easy it is to accidentally disable hydration.
    
- Another user described nearly the exact scenario you have: _“SvelteKit project was pretty funky after publishing on Cloudflare Pages... if I go on the index, JS stops working without any error notice in console.”_ They initially suspected their `load` functions and configuration. The conversation revealed two key fixes: (1) An improper Vite build setup was corrected – removing extra config made the client JS work – and (2) that user also discovered a `csr = dev` flag in example code that was **disabling JS in production** for some pages. After addressing those, their Cloudflare deployment behaved normally.
    
- It appears these issues are popping up in the community, but solutions have been case-by-case (remove a flag here, tweak a config there). No single “Cloudflare Pages bug” has been identified publicly. Instead, the pattern suggests that **SvelteKit’s hydration can be fragile to certain build settings or code flags, which manifest on Cloudflare’s platform (and possibly others) as a total hydration failure**. Developers who aren’t aware of the `csr` setting or Cloudflare’s peculiars might think the platform is to blame when it’s actually a subtle SvelteKit config issue – and vice versa.
    

**Bottom line:** There is not yet an official acknowledgment of a core SvelteKit–Cloudflare incompatibility causing this, but enough anecdotal evidence exists to take it seriously. The combination of SvelteKit 2.x and Cloudflare Pages has worked for many, but if you happen to hit the wrong edge case (as you did), the result is a completely non-functional SPA with no obvious errors – a very frustrating situation.

## Recommendations and Next Steps

Given the complexity, here’s a plan of attack to resolve or work around the issue:

### 1. **Create a Minimal Reproduction**

This is the first and most important step. Take the simplest possible SvelteKit app and deploy it to Cloudflare Pages to see if hydration works. For example, create a fresh SvelteKit project with just a `<script>onMount(() => console.log('mounted'))</script><p>Hello</p>` on the front page. Deploy that to a test Pages project. If **that** also fails to hydrate on Cloudflare, then you’ve uncovered a fundamental issue. If it succeeds, then the problem lies in your app’s code or build config.

While making the repro, incrementally add pieces of your real app to isolate what triggers the failure. Perhaps include the same dependencies, or the same router setup. For instance, if adding your `<script>` that fetches from the Workers API causes the no-hydration, that could indicate something (though fetch in onMount shouldn’t block hydration). The minimal repro will also be incredibly useful to share with Svelte maintainers or Cloudflare support. It’s much easier for others to help if they can deploy your tiny example and see the breakage.

### 2. **Test on Alternate Platforms**

Deploy the **same app** to another SSR-capable platform like Vercel or Netlify. Both support SvelteKit (using their respective adapters or adapter-auto). If the app hydrates fine on Vercel but not on Cloudflare, that strongly points to a Cloudflare-specific issue (environment or adapter). If it fails on both, the problem is likely in your SvelteKit code/config rather than Cloudflare. Either result is informative. You might find that Netlify, for example, works out-of-the-box – which could justify switching hosts if time is critical. (There’s no guarantee, but Vercel and Netlify have very mature SvelteKit support since they’re Node-based; Cloudflare’s worker-based approach is newer territory.)

### 3. **Double-Check SvelteKit Config Flags**

Audit your project for anything that could suppress client-side execution:

- Search for `csr` flags as discussed. Remove any that aren’t absolutely needed. Remember that `export const csr = dev` will be `false` in production builds (because `import.meta.env.DEV` is false), thus disabling hydration. For production, you almost always want CSR enabled (except in truly static pages where you intentionally want a non-interactive page).
    
- Ensure no routes are mistakenly prerendered or have `ssr: false` when they shouldn’t. In your case, you set `prerender = false` for pages and layout, which is correct for an SSR app. Just confirm there’s no global `kit.prerender` setting left over.
    
- Check your `svelte.config.js` and `vite.config.js`. Remove exotic customizations. Temporarily disable any Vite plugins (other than Svelte’s) and test. Some transformations might be breaking the module or preventing the startup script from running properly on the target environment.
    
- If you downgraded dependencies during debugging, ensure there aren’t version mismatches that could cause client/server out-of-sync behavior. Using a matched set of SvelteKit, adapter, and Svelte version is important. (Your current combo of Kit 2.12.0 and adapter-cloudflare 4.6.0 should be fine, and in fact was chosen as a known stable set.)
    

### 4. **Examine Cloudflare Pages Settings**

Review the Cloudflare Pages project settings:

- **Compatibility Flags**: You already set `nodejs_compat` for the functions environment. That shouldn’t affect client hydration, but as a test you might remove it if it’s not needed (it’s meant for using certain Node libs in the worker).
    
- **Environment Variables**: If you ever used adapter-auto, set `CF_PAGES=1` in the build environment so SvelteKit knows it’s targeting Cloudflare. This ensures correct routing behavior. It likely doesn’t relate to hydration, but it’s good practice.
    
- **HTML Rewrites**: As mentioned, turn off Email Obfuscation for your custom domain (if you’re using one) by creating a Page Rule to disable it, or via the Cloudflare dashboard. Also disable Rocket Loader or any Performance optimizations that auto-modify JS. Basically, make sure Cloudflare is serving your exact files with no funny business.
    
- **Headers/Content-Security-Policy**: Ensure you didn’t set a CSP that blocks inline scripts or module imports. Cloudflare Pages doesn’t set a CSP by default, but if you added one via the `_headers` file or Cloudflare settings, it could potentially block the dynamic `import()` of the SvelteKit bundles. A quick check is to open devtools > Network and inspect the response headers of your page and JS files for any CSP or CORS issues (though your curl tests show `access-control-allow-origin: *` on assets, so that’s fine).
    

### 5. **Engage the Community or Maintainers**

If the issue persists after the above, consider opening a GitHub issue on the SvelteKit repo with your findings, **especially if you have a minimal reproduction**. Include details like SvelteKit version, adapter version, Cloudflare Pages compatibility date, etc., and what you’ve tried. It’s possible this is an undiscovered bug. The Svelte team and community are pretty responsive, and since Cloudflare Pages is officially supported, they’ll be interested if something basic isn’t working. Likewise, you can ask on the Cloudflare Workers Discord or Forums – sometimes Cloudflare staff or experts there might know of an esoteric issue (for example, if the V8 engine on CF has a known bug with a certain JS feature that SvelteKit uses – purely speculative, but worth probing). So far, a scan of Cloudflare’s forum shows mostly build errors or Node module issues, not this hydration symptom, so you might be charting new territory.

### 6. **Workarounds and Alternatives**

While investigation continues, you might need a stop-gap to have a functional site:

- **Static Pre-render + Mild JS**: One option is to use `adapter-static` to prerender as much as possible, essentially serving a non-interactive version of the site, and then add a small `<script>` or Svelte component that fetches your data and enables interactivity after load. This is almost what you have, except SvelteKit normally would handle that hydration. In a pinch, you could bypass SvelteKit’s broken hydration and do manual DOM updates. For example, deliver the “Loading…” state as static HTML, and include a custom script to fetch the data from your Workers API and populate the DOM. This is not ideal – it’s reinventing what SvelteKit is supposed to do – but it **could get basic functionality up** if you’re truly stuck and need a quick fix for users.
    
- **Use Cloudflare Workers for SSR (directly)**: Instead of Pages, you could try deploying your SvelteKit app via the Workers platform (using `wrangler publish` with the Cloudflare adapter). Cloudflare Pages is essentially doing this under the hood, but using Wrangler v3/v4 and Pages integration. There’s a slim chance that deploying as a standalone Worker (with a custom Workers domain) might behave differently or allow more insight (you can test it with `wrangler dev` to see logs). It’s a long shot – likely the behavior will be the same – but it gives you another variable to tweak.
    
- **Try an Older Framework or Different Adapter**: If time permits, you might attempt SvelteKit’s `adapter-static` fully (with `prerender` on and no SSR). Some have reported that even with adapter-static they saw no JS (again due to the CSR flag issue), so ensure hydration is enabled. A purely static build would run entirely in the browser, so Cloudflare’s edge would just serve files. That usually avoids weird platform issues, at the cost of losing true SSR. Your app might be able to work as a static SPA (it will just fetch all data from the API on client side). In fact, since you already have a separate API, this could be viable: build the frontend as a static SPA and let it call the Workers API. This bypasses the Pages Functions entirely (no SSR, no Cloudflare Worker for HTML), thus avoiding the area where we suspect the incompatibility lies. The downside is SEO (no SSR content for crawlers) and possibly a slight performance hit on first load.
    
- **Switch Framework**: As a last resort, consider that the combination of _SvelteKit + Cloudflare Pages + (perhaps Svelte 5)_ might be immature. Frameworks like **Astro** (which supports partial hydration and has an adapter for Cloudflare) or **Next.js** (which Cloudflare officially supports via their `next-on-pages` compatibility layer) might prove less problematic. In one developer’s words, after struggling, they migrated from SvelteKit to Astro for a Cloudflare project and found it more straightforward. That’s obviously a heavy decision – you chose SvelteKit for a reason – but if you’re completely blocked, it’s worth evaluating. Migrating the frontend to another framework could take time, but the fact your backend is already decoupled (Hono API) means you can swap out the frontend without changing the server logic. If you do go this route, test a simple prototype on Cloudflare Pages first to ensure **that** framework doesn’t have a similar surprise.
    

### 7. **Await Updates**:

Keep an eye on SvelteKit release notes and Cloudflare announcements. It’s possible that a future SvelteKit patch or Cloudflare Pages update will incidentally fix this. For example, SvelteKit’s August 2024 update included “significant hydration improvements” which might address obscure cases. Similarly, Cloudflare might update their runtime or Pages Functions (they continuously improve V8, compatibility flags, etc.). If the issue is deep within their platform, it may get silently resolved with time. This is more of a passive approach – not helpful for immediate needs, but good to monitor.

## Conclusion & Key Insights

**Where is the conflict?** All signs point to a subtle **framework-platform conflict** at the point of client-side initialization. The SSR output and static files are fine, which narrows it to “JS not taking over the page.” In the absence of obvious mistakes in your code, the likely culprits were either a SvelteKit config (CSR disabled) or a platform nuance (Cloudflare altering or timing out something).

To recap the high-level findings:

- **SvelteKit Hydration Mechanism vs Cloudflare:** The problem likely lies “at the intersection” of SvelteKit’s client-side hydration logic and the Cloudflare Pages environment. While not officially incompatible, this combo has shown to be brittle in certain cases.
    
- **No Error Feedback:** The complete lack of errors is a clue – it usually means the framework thought everything was fine (e.g., it _intended_ not to run JS due to a setting), or it caught an error and suppressed it. Identifying which requires surfacing more debug info (hence the need for a dev-mode reproduction).
    
- **Community reports:** Other developers have encountered similar symptoms on Cloudflare Pages recently, and in those cases the resolution was to fix configuration issues in the SvelteKit app (especially the `csr` flag) or remove incompatible build customizations. This suggests the issue is not Cloudflare **outright breaking SvelteKit**, but rather SvelteKit needing correct settings for the environment.
    
- **Actionable next steps:** Focus on isolating the cause with minimal tests and then adjust either the app or the environment accordingly. If no solution emerges, have a backup plan (static SPA or alternate framework) to deliver a working site to users.
    

At the end of the day, SvelteKit + Cloudflare Pages **should** work and has worked for others. Your situation is extreme – after exhaustive debugging you “cannot achieve basic SPA functionality” on this platform. By methodically checking the points above, you are likely to uncover the missing piece. Whether it’s a single line (`csr = dev` or a stray compatibility issue) or an actual bug in need of a patch, you’ll at least know where the fault lies.

**Priority recommendations:** Create that minimal reproduction **and try it on Cloudflare Pages and another host** – this will definitively tell you if the fault lives in your code or in Cloudflare’s platform. From there, the path (fix or migrate) will become clear. Given the impact (the app is completely non-functional in production), this is a high-priority issue to resolve one way or another. Don’t hesitate to loop in the SvelteKit team on GitHub discussions once you have a minimal case – they can likely pinpoint the internal cause of the hydration failure if it’s within SvelteKit’s realm.

Finally, if time is of the essence and a quick fix isn’t found, lean on the **static fallback or alternative hosting** to get something working. Even a temporarily static version of the site is better than one that appears broken to all users. You can then continue the deeper investigation without the business or user experience grinding to a halt.

By systematically following these steps, you should either solve the Cloudflare Pages issue or have a clear justification to use a different approach. This kind of platform-level mystery is challenging, but the silver lining is that you will gain a much deeper understanding of SvelteKit’s hydration internals and Cloudflare’s nuances through the process. Good luck, and keep an eye on those community threads for any new insights as well!

**Sources:**

- Internal deployment report and debug logs for the failing SvelteKit app.
    
- Cloudflare Pages and SvelteKit documentation on configuration and known issues.
    
- Community discussions of similar issues: disabling `csr` flag effect, build config fixes, and Cloudflare-specific hydration anecdotes.
    
- Example of Cloudflare service (Email Obfuscation) causing hydration mismatch in a React app – illustrating how platform features can affect client JS.