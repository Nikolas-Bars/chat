import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateUserInputDto } from './input-dto/create-user.input.dto';
import { UserViewDto } from './view-dto/user.view.dto';
import { UsersService } from '../application/users.service';
import { JwtAuthGuard } from '../../auth/infrastructure/guards/jwt-auth.guard';
import { ExtractUserFromRequest } from '../../auth/decorators/extract-user-from-request.decorator';
import { UserContextDto } from '../../auth/application/user-context.dto';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/infrastructure/guards/roles.guard';
import { UserRole } from '../domain/user-role.enum';
import { UpdateUserRoleInputDto } from './input-dto/update-user-role.input.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    return this.usersService.create(body);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  async findAll(
    @Query('query') query?: string,
    @Query('limit') limitRaw?: string,
  ): Promise<UserViewDto[]> {
    const limit = Math.min(Math.max(Number(limitRaw ?? 5) || 5, 1), 50);
    return this.usersService.findForAdminPanel(query ?? '', limit);
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async search(
    @Query('query') query: string,
    @ExtractUserFromRequest() user: UserContextDto,
  ) {
    const term = (query ?? '').trim();
    if (!term) {
      return [];
    }
    const users = await this.usersService.searchByTerm(term, Number(user.userId));
    return users.map((u) => ({
      id: u.id,
      name: u.name,
      lastName: u.lastName,
      email: u.email,
      role: u.role,
    }));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ROOT)
  @Patch(':userId/role')
  async updateRole(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() body: UpdateUserRoleInputDto,
  ): Promise<UserViewDto> {
    const updated = await this.usersService.updateRole(userId, body.role);
    return UserViewDto.fromEntity(updated);
  }
}
