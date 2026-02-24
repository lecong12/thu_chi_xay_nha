# Stage 1: Build the React application

FROM node:18-alpine as build



WORKDIR /app



COPY package*.json ./

RUN npm install



# --- DEBUGGING BUILD VARIABLES ---

# This block will print the environment variables received during the build.

# This helps verify that the variables from the Railway dashboard are correct.

ARG REACT_APP_SHEET_ID

ARG REACT_APP_APPSHEET_APP_ID

ARG REACT_APP_APPSHEET_ACCESS_KEY

ARG REACT_APP_APPSHEET_TABLE_NAME



# Thiết lập biến môi trường từ ARG để React có thể nhận được khi build

ENV REACT_APP_SHEET_ID=$REACT_APP_SHEET_ID

ENV REACT_APP_APPSHEET_APP_ID=$REACT_APP_APPSHEET_APP_ID

ENV REACT_APP_APPSHEET_ACCESS_KEY=$REACT_APP_APPSHEET_ACCESS_KEY

ENV REACT_APP_APPSHEET_TABLE_NAME=$REACT_APP_APPSHEET_TABLE_NAME



RUN echo "--- Verifying Build-Time Environment Variables ---" && \

    echo "1. SHEET_ID: $REACT_APP_SHEET_ID" && \

    echo "2. APP_ID: $REACT_APP_APPSHEET_APP_ID" && \

    echo "3. TABLE_NAME: $REACT_APP_APPSHEET_TABLE_NAME" && \

    (if [ -z "$REACT_APP_APPSHEET_ACCESS_KEY" ]; then echo "4. ACCESS_KEY: IS EMPTY!!!"; else echo "4. ACCESS_KEY: Received."; fi) && \

    echo "----------------------------------------------------"



COPY . .

RUN npm run build



# Stage 2: Serve the application with Nginx

FROM nginx:alpine



COPY --from=build /app/build /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf



EXPOSE 80
