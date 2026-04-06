import { Body, Controller, Get, Post } from '@nestjs/common';
import { CreateUserInputDto } from './input-dto/create-user.input.dto';
import { UserViewDto } from './view-dto/user.view.dto';
import { UsersService } from '../application/users.service';

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
}
