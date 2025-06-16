# Deploying Galactic Run to GitHub Pages

Due to compatibility issues with running Vite in the current environment (`TypeError: crypto$2.getRandomValues is not a function`), this guide provides steps to manually deploy the project to GitHub Pages using static files with CDN links for dependencies.

## Steps to Deploy

1. **Ensure you're on the correct branch**: Make sure you're on the `rebuild/yuka-core` branch where the latest changes are.

   ```bash
   git checkout rebuild/yuka-core
   ```

2. **Commit the latest changes**: Ensure all recent updates are committed.

   ```bash
   git add .
   git commit -m "Update for GitHub Pages deployment with CDN links"
   ```

3. **Create a new `gh-pages` branch**: This branch will be used to host the static files for GitHub Pages. If it already exists, you can update it.

   ```bash
   git checkout --orphan gh-pages
   ```

4. **Add all files**: Add all the project files to this branch.

   ```bash
   git add .
   git commit -m "Deploy to GitHub Pages with CDN setup"
   ```

5. **Push the branch to GitHub**: Push the `gh-pages` branch to your repository.

   ```bash
   git push origin gh-pages
   ```

6. **Configure GitHub Pages**: In your GitHub repository settings, go to the "Pages" section and set the source to the `gh-pages` branch. GitHub will provide a URL (e.g., `https://username.github.io/repository-name`) where your site will be hosted.

7. **Access your site**: After a few minutes, your site should be live at the provided GitHub Pages URL.

## Notes

- The `index.html` file has been updated to use CDN links for Three.js and Yuka, allowing the project to be served as static files without a build step.
- The `src/main.js` file has been modified to use global objects (`THREE` and `YUKA`) provided by the CDN scripts, removing the need for ES module imports.
- This setup should work for static hosting on GitHub Pages. If you encounter issues, it might be necessary to revisit the environment setup or Node.js version to resolve the Vite compatibility issue for a more robust build process.

If you need further assistance or run into issues, feel free to ask.
