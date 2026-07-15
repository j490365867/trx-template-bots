# ===== 构建阶段 =====
FROM node:20-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存加速
COPY package*.json tsconfig*.json ./
RUN npm ci

# 复制源码并编译
COPY src ./src
RUN npm run build

# ===== 生产阶段 =====
FROM node:20-alpine AS runner

WORKDIR /app

# 复制 package.json 和 node_modules（仅生产依赖）
COPY package*.json ./
RUN npm ci --production --ignore-scripts

# 从构建阶段复制编译产物
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]

# 单阶段：直接运行 TypeScript 源码
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件并安装全部依赖（包括 devDependencies，因为 ts-node-dev 在其中）
COPY package*.json tsconfig*.json ./
RUN npm ci

# 复制源码
COPY src ./src

EXPOSE 3000

# 使用 ts-node-dev 直接运行，带热重载
CMD ["npm", "run", "start:dev"]
