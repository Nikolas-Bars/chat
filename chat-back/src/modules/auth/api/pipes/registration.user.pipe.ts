import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { RegistrationInputDto } from '../input-dto/registration.input-dto';
import { UsersExternalService } from '../../../users/application/users-external.service';

@Injectable()
export class RegistrationUserPipe implements PipeTransform<RegistrationInputDto> {
  constructor(private readonly usersExternalService: UsersExternalService) {}

  async transform(data: RegistrationInputDto): Promise<RegistrationInputDto> {
    const existingUser = await this.usersExternalService.findByEmail(data.email);

    if (existingUser) {
      throw new BadRequestException('User with this email already exists');
    }

    return data;
  }
}
