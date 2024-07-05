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
  captcha(@Query('address') address: string) {
    return this.userService.registerCatpcha(address);
  }

  @Post('login')
  userLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, false);
  }

  @Post('admin/login')
  adminLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, true);
  }

  @Get('refresh')
  refresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken);
  }

  @Get('admin/refresh')
  adminRefresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken);
  }

  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }
}
