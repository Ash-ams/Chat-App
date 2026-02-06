# Git Setup Instructions

Follow these steps to push your Chat App project to GitHub:

## Step 1: Initialize Git Repository

```bash
cd C:\MINE\PPS\Chat_App
git init
```

## Step 2: Add All Files

```bash
git add .
```

## Step 3: Create Initial Commit

```bash
git commit -m "Initial commit: Real-time chat application with React and Node.js"
```

## Step 4: Create Repository on GitHub

1. Go to [GitHub](https://github.com) and sign in
2. Click the "+" icon in the top right corner
3. Select "New repository"
4. Name it (e.g., "chat-app" or "real-time-chat-app")
5. **DO NOT** initialize with README, .gitignore, or license (we already have these)
6. Click "Create repository"

## Step 5: Add Remote and Push

After creating the repository on GitHub, you'll see instructions. Use these commands:

```bash
# Add remote repository (replace YOUR_USERNAME and REPO_NAME with your actual values)
git remote add origin https://github.com/YOUR_USERNAME/REPO_NAME.git

# Rename default branch to main (if needed)
git branch -M main

# Push to GitHub
git push -u origin main
```

## Alternative: Using SSH (if you have SSH keys set up)

```bash
git remote add origin git@github.com:YOUR_USERNAME/REPO_NAME.git
git branch -M main
git push -u origin main
```

## Troubleshooting

### If you get authentication errors:
- Use GitHub Personal Access Token instead of password
- Or set up SSH keys: https://docs.github.com/en/authentication/connecting-to-github-with-ssh

### If you need to update later:
```bash
git add .
git commit -m "Your commit message"
git push
```

### To check status:
```bash
git status
```

### To see remote:
```bash
git remote -v
```
