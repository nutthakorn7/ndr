# Deploy NDR Dashboard Demo to GitHub

This guide shows how to deploy your interactive NDR Dashboard demo online (with mock data) so anyone can access it.

## 🚀 Option 1: GitHub Pages (Recommended)

**Free, easy, and hosted on GitHub**

### Steps:

1. **Add deployment script to package.json**
```bash
cd /Users/pop7/Code/NDR/ui
```

Add this to `package.json` in the `scripts` section:
```json
"deploy": "vite build && npx gh-pages -d dist"
```

2. **Install gh-pages**
```bash
npm install --save-dev gh-pages
```

3. **Update vite.config.js for GitHub Pages**

Add `base` configuration:
```javascript
export default defineConfig({
  plugins: [react()],
  base: '/ndr/', // Replace with your repo name
})
```

4. **Build and deploy**
```bash
npm run deploy
```

5. **Enable GitHub Pages**
- Go to https://github.com/nutthakorn7/ndr/settings/pages
- Source: `gh-pages` branch
- Click Save

**Your demo will be live at:** `https://nutthakorn7.github.io/ndr/`

---

## 🌟 Option 2: Vercel (Easiest - Automatic Deployment)

**Zero configuration, automatic builds on every push**

### Steps:

1. **Go to** [vercel.com](https://vercel.com)
2. **Sign in** with GitHub
3. **Import Project** → Select `nutthakorn7/ndr`
4. **Configure:**
   - Framework Preset: `Vite`
   - Root Directory: `ui`
   - Build Command: `npm run build`
   - Output Directory: `dist`
5. **Deploy**

**Done!** Your demo will be live at `https://ndr-xxx.vercel.app`

**Benefits:**
- ✅ Automatic deployment on every git push
- ✅ Preview deployments for branches
- ✅ Free custom domain
- ✅ Analytics included

---

## 🎯 Option 3: Netlify (Alternative to Vercel)

**Similar to Vercel, also very easy**

### Steps:

1. **Go to** [netlify.com](https://netlify.com)
2. **Sign in** with GitHub
3. **Add new site** → Import from Git → Select `ndr`
4. **Configure:**
   - Base directory: `ui`
   - Build command: `npm run build`
   - Publish directory: `ui/dist`
5. **Deploy**

**Live at:** `https://ndr-xxx.netlify.app`

---

## 📋 Quick Setup (GitHub Pages)

**Run these commands:**

```bash
# Navigate to UI folder
cd /Users/pop7/Code/NDR/ui

# Install gh-pages
npm install --save-dev gh-pages

# Add deploy script to package.json (do manually or use jq)
npm pkg set scripts.deploy="vite build && npx gh-pages -d dist"

# Deploy!
npm run deploy
```

Then enable GitHub Pages in repo settings.

---

## 🔧 Pre-Deployment Checklist

Before deploying, verify:

- [x] Build succeeds: `npm run build`
- [x] No console errors in production build
- [x] All routes work correctly
- [x] Mock data displays properly
- [ ] Update README with demo link
- [ ] Add "View Live Demo" badge
- [ ] Test on mobile devices

---

## 🎨 Add Live Demo Badge to README

Add this to your README.md:

```markdown
# Open NDR Dashboard

[![Live Demo](https://img.shields.io/badge/demo-live-success)](https://nutthakorn7.github.io/ndr/)
[![GitHub](https://img.shields.io/github/stars/nutthakorn7/ndr?style=social)](https://github.com/nutthakorn7/ndr)

🔴 **[View Live Demo →](https://nutthakorn7.github.io/ndr/)**

Enterprise-grade Network Detection & Response dashboard with real-time threat visualization.

![Dashboard Screenshot](screenshot.png)
```

---

## 🐛 Troubleshooting

### Issue: Blank page after deployment

**Solution:** Check `vite.config.js` has correct `base` path:
```javascript
base: '/ndr/'  // Must match repo name
```

### Issue: Routes not working (404)

**Solution:** For GitHub Pages, add a `404.html` that redirects to `index.html`:
```bash
cp ui/dist/index.html ui/dist/404.html
```

### Issue: API calls failing

**Expected** - This is a demo with mock data. Backend integration comes later.

---

## 📊 What Visitors Will See

✅ **Fully Interactive UI**
- All 17 components working
- Real-time data simulation
- Interactive charts and graphs
- Responsive design
- Professional SOC wallboard with world threat map

⚠️ **Mock Data Note**
Add a banner to notify users it's demo data:

```javascript
// Add to Dashboard.jsx
<div className="demo-banner">
  🎭 Demo Mode: Using simulated data. Backend integration coming soon!
</div>
```

---

## 🚀 Recommended: Use Vercel

**Why Vercel is best for your use case:**

1. ✅ **Zero config** - Just connect and deploy
2. ✅ **Automatic deployments** - Every push goes live
3. ✅ **Preview URLs** - Test before merging
4. ✅ **Fast CDN** - Global edge network
5. ✅ **Free tier** - More than enough for demos
6. ✅ **Custom domain** - Easy to add later

**Takes 2 minutes to set up!**

---

## 📝 Next Steps After Deployment

1. ✅ Share the live demo link
2. ✅ Add to GitHub repo description
3. ✅ Include in README
4. ✅ Post on LinkedIn/Twitter
5. ⏳ Work on backend integration
6. ⏳ Deploy full-stack later

---

## 🎉 Example Live Demo Sites

Similar dashboard demos:
- https://demo.grafana.com
- https://demo.elastic.co
- https://www.splunk.com/demo

Your demo will look just as professional!

---

**Need help?** Just ask and I can run these commands for you! 🚀
