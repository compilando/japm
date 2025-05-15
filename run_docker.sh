#!/bin/bash

# Nombre para la imagen y el contenedor Docker
IMAGE_NAME="japm-api"
CONTAINER_NAME="japm-api-container"

# Puerto en el que la aplicación escuchará dentro del contenedor (debe coincidir con EXPOSE en Dockerfile)
CONTAINER_PORT=3001
# Puerto que se expondrá en el host
HOST_PORT=3001

# Detener y eliminar el contenedor si ya existe
if [ "$(docker ps -q -f name=$CONTAINER_NAME)" ]; then
    echo "Deteniendo el contenedor existente $CONTAINER_NAME..."
    docker stop $CONTAINER_NAME
fi
if [ "$(docker ps -aq -f name=$CONTAINER_NAME)" ]; then
    echo "Eliminando el contenedor existente $CONTAINER_NAME..."
    docker rm $CONTAINER_NAME
fi

# Construir la imagen Docker
echo "Construyendo la imagen Docker $IMAGE_NAME..."
docker build -t $IMAGE_NAME .

# Verificar si la construcción fue exitosa
if [ $? -ne 0 ]; then
    echo "Error durante la construcción de la imagen Docker. Abortando."
    exit 1
fi

# Ejecutar el contenedor Docker
echo "Ejecutando el contenedor Docker $CONTAINER_NAME..."
# Si tienes un archivo .env para las variables de entorno:
if [ -f .env ]; then
    echo "Usando variables de entorno del archivo .env"
    docker run -d \
        --name $CONTAINER_NAME \
        -p $HOST_PORT:$CONTAINER_PORT \
        --env-file .env \
        $IMAGE_NAME
else
    echo "ADVERTENCIA: No se encontró el archivo .env. La aplicación podría no funcionar correctamente sin las variables de entorno necesarias."
    echo "Puedes pasar variables de entorno manualmente usando la opción -e, por ejemplo: -e DATABASE_URL=..."
    docker run -d \
        --name $CONTAINER_NAME \
        -p $HOST_PORT:$CONTAINER_PORT \
        $IMAGE_NAME
fi

# Verificar si el contenedor se inició correctamente
if [ $? -eq 0 ]; then
    echo ""
    echo "Contenedor $CONTAINER_NAME iniciado exitosamente."
    echo "La aplicación debería estar disponible en http://localhost:$HOST_PORT"
    echo "Para ver los logs, usa: docker logs -f $CONTAINER_NAME"
    echo "Para detener el contenedor, usa: docker stop $CONTAINER_NAME"
else
    echo "Error al iniciar el contenedor $CONTAINER_NAME."
fi 