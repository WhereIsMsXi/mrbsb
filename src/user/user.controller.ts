import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequireLogin, UserInfo } from 'src/custom.decorater';
import { createUserInfoVO } from './em/helper.em';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';

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

  /**
   * 登陆
   */
  @Post('login')
  userLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, false);
  }

  /**
   * 管理员登陆
   */
  @Post('admin/login')
  adminLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, true);
  }

  /**
   * 刷新 token
   */
  @Get('refresh')
  refresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken, false);
  }

  /**
   * 刷新管理员 token
   */
  @Get('admin/refresh')
  adminRefresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken, true);
  }

  /**
   * 更新密码
   */
  @Post(['update_password', 'admin/update_password'])
  @RequireLogin()
  async updatePassword(
    @UserInfo('userId') userId: number,
    @Body() passwordDto: UpdateUserPasswordDto,
  ) {
    return await this.userService.updatePassword(userId, passwordDto);
  }

  /**
   * 发送更改密码的验证码
   */
  @Get('update_password/captcha')
  async updatePasswordCaptcha(@Query('address') address: string) {
    return await this.userService.updatePasswordCaptcha(address);
  }

  /**
   * 更新用户信息
   */
  @Post(['update', 'admin/update'])
  @RequireLogin()
  async update(
    @UserInfo('userId') userId: number,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.userService.update(userId, updateUserDto);
  }

  /**
   * 发送更新用户信息的验证码
   */
  @Get('update/captcha')
  async updateUserCaptcha(@Query('address') address: string) {
    return await this.userService.updateCaptcha(address);
  }

  /**
   * Helper
   */
  @Get('init-data')
  async initData() {
    await this.userService.initData();
    return 'done';
  }

  @Get('info')
  @RequireLogin()
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailById(userId);
    const vo = createUserInfoVO(user);
    return vo;
  }
}
