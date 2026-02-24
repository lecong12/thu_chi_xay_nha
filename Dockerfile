# Stage 1: Build the React application
FROM node:18-alpine as build

WORKDIR /app

COPY package*.json ./

# SỬA LỖI 1: Thêm --legacy-peer-deps để tránh xung đột thư viện như vercel.json yêu cầu
RUN npm install --legacy-peer-deps

# Khai báo các đối số (Arguments) mà Railway sẽ truyền vào
ARG REACT_APP_SHEET_ID
ARG REACT_APP_APPSHEET_APP_ID
ARG REACT_APP_APPSHEET_ACCESS_KEY
ARG REACT_APP_APPSHEET_TABLE_NAME

# SỬA LỖI 2: Ép các biến này thành biến môi trường thực thụ để React nhúng vào code khi build
ENV REACT_APP_SHEET_ID=${REACT_APP_SHEET_ID}
ENV REACT_APP_APPSHEET_APP_ID=${REACT_APP_APPSHEET_APP_ID}
ENV REACT_APP_APPSHEET_ACCESS_KEY=${REACT_APP_APPSHEET_ACCESS_KEY}
ENV REACT_APP_APPSHEET_TABLE_NAME=${REACT_APP_APPSHEET_TABLE_NAME}

# --- DEBUGGING BUILD VARIABLES ---
RUN echo "--- Verifying Build-Time Environment Variables ---" && \
    echo "1. SHEET_ID: $REACT_APP_SHEET_ID" && \
    echo "2. APP_ID: $REACT_APP_APPSHEET_APP_ID" && \
    echo "3. TABLE_NAME: $REACT_APP_APPSHEET_TABLE_NAME" && \
    (if [ -z "$REACT_APP_APPSHEET_ACCESS_KEY" ]; then echo "4. ACCESS_KEY: IS EMPTY!!!"; else echo "4. ACCESS_KEY: Received."; fi) && \
    echo "----------------------------------------------------"

COPY . .

# SỬA LỖI 3: Thêm CI=false để bỏ qua các cảnh báo làm gián đoạn quá trình build
RUN CI=false npm run build

# Stage 2: Serve the application with Nginx
FROM nginx:alpine

# Copy tệp đã build từ Stage 1
COPY --from=build /app/build /usr/share/nginx/html

# Đảm bảo bạn có tệp nginx.conf trong thư mục gốc, nếu không hãy xóa dòng dưới đây
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]