import {
  Body,
  Controller,
  Get,
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

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async create(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    return this.usersService.create(body);
  }

  @Get()
  async findAll(): Promise<UserViewDto[]> {
    return this.usersService.findAll();
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
    }));
  }
}
