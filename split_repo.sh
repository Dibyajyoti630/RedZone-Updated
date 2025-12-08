#!/usr/bin/env bash
set -e

# Safety
echo "Make sure you've committed your changes. Press ENTER to continue, or Ctrl+C to abort."
read

ROOT_PKG="package.json"
if [ ! -f "$ROOT_PKG" ]; then
  echo "No package.json found in this directory. Abort."
  exit 1
fi

# Backup original package.json
cp package.json package.json.bak
echo "Backed up package.json -> package.json.bak"

# Create directories
mkdir -p client server

# --- Move frontend items to client ---
FRONT_FILES=(src public index.html vite.config.js map.png index.html.map)
for f in "${FRONT_FILES[@]}"; do
  if [ -e "$f" ]; then
    echo "Moving $f -> client/"
    git mv "$f" client/ || mv "$f" client/
  fi
done

# Also move common frontend-looking files if exist
for f in package-lock.json yarn.lock README.md LICENSE; do
  # leave README at root, but move package-lock.json if it exists for client
  if [ -e "$f" ] && [ "$f" = "package-lock.json" ]; then
    echo "Moving package-lock.json -> client/"
    git mv "$f" client/ || mv "$f" client/
  fi
done

# --- Move backend items to server ---
BACK_FILES=(index.js routes models middleware utils uploads seed.js verify-connection.js mongod.conf .env.example .env.local .env.local.example)
for f in "${BACK_FILES[@]}"; do
  if [ -e "$f" ]; then
    echo "Moving $f -> server/"
    git mv "$f" server/ || mv "$f" server/
  fi
done

# Also move any js files in root that look backend-like
for f in *.js; do
  if [ -f "$f" ]; then
    # don't move client build maps or other client artifacts
    if [[ "$f" != "vite.config.js" && "$f" != "index.html" && "$f" != "map.png" ]]; then
      # If file is one of the known backend entry files moved, skip
      if [[ "$f" != "index.js" && "$f" != "seed.js" && "$f" != "verify-connection.js" ]]; then
        # Inspect file for 'express' or 'mongoose' to decide moving
        if grep -q "express" "$f" || grep -q "mongoose" "$f" || grep -q "require('express')" "$f" || grep -q "require(\"express\")" "$f"; then
          echo "Moving backend-like file $f -> server/"
          git mv "$f" server/ || mv "$f" server/
        fi
      fi
    fi
  fi
done

# --- Split package.json by heuristics using Node script ---
node - <<'NODE'
const fs = require('fs');
const path = require('path');

const rootPkgPath = path.join(process.cwd(), 'package.json');
const raw = fs.readFileSync(rootPkgPath, 'utf8');
const pkg = JSON.parse(raw);

const frontRegex = /(react|vite|@vitejs|@testing-library|tailwindcss|postcss|autoprefixer|sass|scss|framer-motion|@shadcn|lucide-react|recharts|@heroicons|axios|zustand|redux|@reduxjs|socket.io-client|dayjs|moment|react-router|react-router-dom)/i;
const devFrontRegex = /(vite|@vitejs|eslint|prettier|babel|webpack|parcel|postcss|tailwindcss|sass|stylelint|husky|lint-staged)/i;

const frontDeps = {};
const serverDeps = {};
const frontDev = {};
const serverDev = {};

function splitDeps(depObj, dev=false) {
  if (!depObj) return;
  Object.keys(depObj).forEach(name => {
    const isFront = frontRegex.test(name) || (dev && devFrontRegex.test(name));
    if (isFront) {
      frontDeps[name] = depObj[name];
    } else {
      serverDeps[name] = depObj[name];
    }
  });
}

splitDeps(pkg.dependencies || {});
splitDeps(pkg.devDependencies || {}, true);

// Make client package.json
const clientPkg = {
  name: pkg.name ? (pkg.name + "-client") : "client",
  private: true,
  version: pkg.version || "1.0.0",
  scripts: {
    dev: "vite",
    build: "vite build",
    preview: "vite preview"
  },
  dependencies: frontDeps,
  devDependencies: frontDev
};

// Make server package.json
const serverPkg = {
  name: pkg.name ? (pkg.name + "-server") : "server",
  private: true,
  version: pkg.version || "1.0.0",
  scripts: Object.assign({
    start: "node index.js",
    dev: "nodemon index.js"
  }, pkg.scripts || {}),
  dependencies: serverDeps,
  devDependencies: serverDev
};

// Remove empty dependency objects
if (Object.keys(clientPkg.dependencies).length === 0) delete clientPkg.dependencies;
if (Object.keys(clientPkg.devDependencies).length === 0) delete clientPkg.devDependencies;
if (Object.keys(serverPkg.dependencies).length === 0) delete serverPkg.dependencies;
if (Object.keys(serverPkg.devDependencies).length === 0) delete serverPkg.devDependencies;

// Write to files
fs.writeFileSync(path.join(process.cwd(), 'client', 'package.json'), JSON.stringify(clientPkg, null, 2));
fs.writeFileSync(path.join(process.cwd(), 'server', 'package.json'), JSON.stringify(serverPkg, null, 2));

console.log("Wrote client/package.json and server/package.json");
NODE

# --- Update references / fix imports (best-effort) ---
# If server code used relative imports requiring being at root, user must verify.

echo "Done moving files and creating client/server package.json files."
echo ""
echo "NEXT STEPS (run these):"
echo "  1) cd client && npm install"
echo "  2) cd ../server && npm install"
echo "  3) Add environment variables:"
echo "       - server: create server/.env (MONGO_URI, JWT_SECRET, PORT, CLIENT_URL etc.)"
echo "       - client: create client/.env with VITE_API_URL=https://your-railway-backend"
echo "  4) Test locally:"
echo "       - In server: npm run dev  (requires nodemon; if not installed run node index.js)"
echo "       - In client: npm run dev"
echo "  5) Check code for any broken relative imports and update paths if needed."
echo ""
echo "If something looks wrong, you can restore package.json from package.json.bak."

exit 0
