import { Controller, Get, Post, Body, Patch, Param, Delete, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
import { User } from '@prisma/client'; // Importar el tipo User de Prisma

@ApiTags('Users') // Tag para agrupar en Swagger
@Controller('users') // Ruta base para este controlador
export class UserController {
    constructor(private readonly userService: UserService) { }

    @Post()
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })) // Habilitar validación
    @ApiOperation({ summary: 'Crear un nuevo usuario' })
    @ApiBody({ type: CreateUserDto })
    @ApiResponse({ status: 201, description: 'El usuario ha sido creado exitosamente.', type: CreateUserDto }) // O un User DTO sin password si prefieres
    @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
    create(@Body() createUserDto: CreateUserDto): Promise<User> {
        // Nota: Devolver el usuario creado puede exponer el hash de la contraseña.
        // Considera devolver un DTO específico o solo un mensaje de éxito.
        return this.userService.create(createUserDto);
    }

    @Get()
    @ApiOperation({ summary: 'Obtener todos los usuarios' })
    @ApiResponse({ status: 200, description: 'Lista de usuarios.', type: [CreateUserDto] }) // Ajustar tipo si es necesario
    findAll(): Promise<User[]> {
        return this.userService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Obtener un usuario por ID' })
    @ApiParam({ name: 'id', description: 'ID del usuario', type: String })
    @ApiResponse({ status: 200, description: 'El usuario encontrado.', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
    findOne(@Param('id') id: string): Promise<User> {
        return this.userService.findOneById(id);
    }

    @Patch(':id')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, skipMissingProperties: true })) // Validar solo campos presentes
    @ApiOperation({ summary: 'Actualizar un usuario por ID' })
    @ApiParam({ name: 'id', description: 'ID del usuario a actualizar', type: String })
    @ApiBody({ type: UpdateUserDto })
    @ApiResponse({ status: 200, description: 'El usuario ha sido actualizado exitosamente.', type: CreateUserDto })
    @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
    @ApiResponse({ status: 400, description: 'Datos de entrada inválidos.' })
    update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto): Promise<User> {
        return this.userService.update(id, updateUserDto);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Eliminar un usuario por ID' })
    @ApiParam({ name: 'id', description: 'ID del usuario a eliminar', type: String })
    @ApiResponse({ status: 200, description: 'El usuario ha sido eliminado exitosamente.' }) // Puede devolver el usuario eliminado si se desea
    @ApiResponse({ status: 404, description: 'Usuario no encontrado.' })
    remove(@Param('id') id: string): Promise<User> {
        return this.userService.remove(id);
    }
}
