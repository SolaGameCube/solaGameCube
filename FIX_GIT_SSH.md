# 修复 Git Pull 需要输入密码的问题

## 问题原因

如果每次 `git pull` 都需要输入账号密码，通常是因为 Git 远程仓库使用的是 **HTTPS URL** 而不是 **SSH URL**。

即使你已经配置了 SSH key，如果远程 URL 是 HTTPS，Git 还是会要求输入密码。

## 解决方案

### 1. 检查当前的远程 URL

```bash
cd /data/projects/SolaGameCube
git remote -v
```

如果输出类似这样（使用 HTTPS）：
```
origin  https://github.com/username/repo.git (fetch)
origin  https://github.com/username/repo.git (push)
```

### 2. 将远程 URL 改为 SSH

```bash
# 方法 1：直接修改（推荐）
git remote set-url origin git@github.com:username/repo.git

# 或者如果是 GitLab
git remote set-url origin git@gitlab.com:username/repo.git

# 或者如果是 Gitee
git remote set-url origin git@gitee.com:username/repo.git
```

### 3. 验证修改

```bash
git remote -v
```

现在应该显示 SSH URL：
```
origin  git@github.com:username/repo.git (fetch)
origin  git@github.com:username/repo.git (push)
```

### 4. 测试 SSH 连接

```bash
# GitHub
ssh -T git@github.com

# GitLab
ssh -T git@gitlab.com

# Gitee
ssh -T git@gitee.com
```

如果看到类似 "Hi username! You've successfully authenticated..." 的消息，说明 SSH 配置正确。

### 5. 测试 Git Pull

```bash
git pull origin main
# 或者
git pull origin master
```

现在应该不需要输入密码了！

## 如果 SSH Key 还没有配置

### 1. 检查是否已有 SSH Key

```bash
ls -la ~/.ssh
```

如果看到 `id_rsa` 和 `id_rsa.pub`（或 `id_ed25519` 和 `id_ed25519.pub`），说明已有 SSH key。

### 2. 如果没有 SSH Key，生成一个

```bash
ssh-keygen -t ed25519 -C "your_email@example.com"
# 或者使用 RSA
ssh-keygen -t rsa -b 4096 -C "your_email@example.com"
```

按提示操作，可以直接按 Enter 使用默认路径和空密码。

### 3. 查看公钥内容

```bash
cat ~/.ssh/id_ed25519.pub
# 或者
cat ~/.ssh/id_rsa.pub
```

### 4. 将公钥添加到 Git 服务提供商

**GitHub:**
1. 访问 https://github.com/settings/keys
2. 点击 "New SSH key"
3. 粘贴公钥内容
4. 保存

**GitLab:**
1. 访问 https://gitlab.com/-/profile/keys
2. 点击 "Add new key"
3. 粘贴公钥内容
4. 保存

**Gitee:**
1. 访问 https://gitee.com/profile/sshkeys
2. 点击 "添加公钥"
3. 粘贴公钥内容
4. 保存

### 5. 测试 SSH 连接

```bash
ssh -T git@github.com
# 或
ssh -T git@gitlab.com
# 或
ssh -T git@gitee.com
```

## 常见问题

### Q: 修改后还是需要密码？

A: 检查以下几点：
1. 确认远程 URL 已改为 SSH（`git remote -v`）
2. 确认 SSH key 已添加到 Git 服务提供商
3. 确认 SSH agent 正在运行：
   ```bash
   eval "$(ssh-agent -s)"
   ssh-add ~/.ssh/id_ed25519
   # 或
   ssh-add ~/.ssh/id_rsa
   ```

### Q: 如何查看当前使用的 SSH key？

```bash
ssh-add -l
```

### Q: 如果使用多个 Git 账户怎么办？

可以配置 SSH config 文件：

```bash
# 编辑 SSH config
nano ~/.ssh/config
```

添加配置：
```
Host github.com
  HostName github.com
  User git
  IdentityFile ~/.ssh/id_ed25519_github

Host gitlab.com
  HostName gitlab.com
  User git
  IdentityFile ~/.ssh/id_ed25519_gitlab
```

## 快速修复命令（一键执行）

```bash
cd /data/projects/SolaGameCube

# 查看当前远程 URL
echo "当前远程 URL:"
git remote -v

# 提示：将下面的 URL 替换为你的实际仓库地址
# git remote set-url origin git@github.com:username/repo.git

# 测试 SSH 连接
echo "测试 SSH 连接:"
ssh -T git@github.com 2>&1 | head -1
```
