import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() registerUser: RegisterUserDto) {
    return this.userService.register(registerUser);
  }

  @Get('register-captcha')
  async captcha(@Query('address') address: string) {
    return this.userService.registerCatpcha(address);
  }

  @Post('login')
  async userLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, false);
  }

  @Post('admin/login')
  async adminLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, true);
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }
}
