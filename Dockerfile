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
