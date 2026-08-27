import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception.code === 'P2002') {
      const conflict = new ConflictException('Ya existe un registro con ese valor único');
      return response.status(409).json(conflict.getResponse());
    }
    if (exception.code === 'P2025') {
      const notFound = new NotFoundException('Recurso no encontrado');
      return response.status(404).json(notFound.getResponse());
    }
    if (exception.code === 'P2003') {
      return response.status(400).json({
        statusCode: 400,
        message: 'Referencia inválida (por ejemplo, categoría inexistente)',
      });
    }

    return response.status(500).json({
      statusCode: 500,
      message: 'Error de base de datos',
    });
  }
}
