---
description: Pull, Commit, Push, and Deploy to Firebase
---

1. Stage all changes
```bash
git add .
```

2. Commit changes
```bash
git commit -m "Update: Race upload, Protest video, Dashboard features"
```

3. Pull latest changes (rebase)
```bash
git pull --rebase
```

4. Push to remote
```bash
git push
```

5. Build the application
```bash
npm run build
```

6. Deploy to Firebase
```bash
npx firebase deploy
```
