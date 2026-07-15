# 单阶段：直接运行 TypeScript 源码
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件并安装全部依赖（包括 devDependencies）
COPY package*.json tsconfig*.json ./
RUN npm ci

# 复制源码
COPY src ./src

EXPOSE 3000

# 使用 ts-node-dev 直接运行 TypeScript 源码
CMD ["npm", "run", "start:dev"]
