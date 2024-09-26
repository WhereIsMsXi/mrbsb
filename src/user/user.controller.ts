import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { RegisterUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RequireLogin, UserInfo } from 'src/custom.decorater';
import { createUserInfoVO } from './em/helper.em';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { generateParseIntPipe } from 'src/utils/utils';
import {
  ApiBearerAuth,
  ApiBody,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RefreshTokenVo } from './vo/refresh-token.vo';
import { UserDetailVo } from './vo/user-info.vo';
import { UserListVo } from './vo/user-list.vo';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { storage } from 'src/my-file-storage';

@ApiTags('用户管理模块')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/验证码不正确/用户已存在',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '注册成功/失败',
    type: String,
  })
  register(@Body() registerUser: RegisterUserDto) {
    return this.userService.register(registerUser);
  }

  @Get('register-captcha')
  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱地址',
    required: true,
    example: 'xxx@xx.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '发送成功',
    type: String,
  })
  captcha(@Query('address') address: string) {
    return this.userService.registerCatpcha(address);
  }

  /**
   * 登陆
   */
  @Post('login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '用户不存在/密码错误',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息和 token',
    type: LoginDto,
  })
  userLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, false);
  }

  /**
   * 管理员登陆
   */
  @Post('admin/login')
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '用户不存在/密码错误',
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '用户信息和 token',
    type: LoginDto,
  })
  adminLogin(@Body() loginUser: LoginDto) {
    return this.userService.login(loginUser, true);
  }

  /**
   * 刷新 token
   */
  @Get('refresh')
  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: '刷新 token',
    required: true,
    example: 'xxxxxxxxyyyyyyyyzzzzz',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'token 已失效，请重新登录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: RefreshTokenVo,
  })
  refresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken, false);
  }

  /**
   * 刷新管理员 token
   */
  @Get('admin/refresh')
  @ApiQuery({
    name: 'refreshToken',
    type: String,
    description: '刷新 token',
    required: true,
    example: 'xxxxxxxxyyyyyyyyzzzzz',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'token 已失效，请重新登录',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '刷新成功',
    type: RefreshTokenVo,
  })
  adminRefresh(@Query('refreshToken') refreshToken: string) {
    return this.userService.refresh(refreshToken, true);
  }

  /**
   * 更新密码
   */
  @Post(['update_password', 'admin/update_password'])
  @ApiBody({
    type: UpdateUserPasswordDto,
  })
  @ApiResponse({
    type: String,
    description: '验证码已失效/不正确',
  })
  async updatePassword(@Body() passwordDto: UpdateUserPasswordDto) {
    return await this.userService.updatePassword(passwordDto);
  }

  /**
   * 发送更改密码的验证码
   */
  @Get('update_password/captcha')
  @ApiQuery({
    name: 'address',
    type: String,
    description: '邮箱地址',
    required: true,
    example: 'xxx@xx.com',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '发送成功',
    type: String,
  })
  updatePasswordCaptcha(@Query('address') address: string) {
    return this.userService.updatePasswordCaptcha(address);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      dest: 'uploads',
      storage: storage,
      limits: {
        fileSize: 1024 * 1024 * 3,
      },
      fileFilter(req, file, callback) {
        const extname = path.extname(file.originalname);
        if (['.png', '.jpg', '.gif'].includes(extname)) {
          callback(null, true);
        } else {
          callback(new BadRequestException('只能上传图片'), false);
        }
      },
    }),
  )
  uploadFile(@UploadedFile() file: Express.Multer.File) {
    return file.path;
  }

  /**
   * 更新用户信息
   */
  @Post(['update', 'admin/update'])
  @RequireLogin()
  @ApiBearerAuth()
  @ApiBody({
    type: UpdateUserDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '验证码已失效/不正确',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '更新成功',
    type: String,
  })
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
  @RequireLogin()
  @ApiBearerAuth()
  @ApiQuery({
    name: 'address',
    description: '邮箱地址',
    type: String,
  })
  @ApiResponse({
    type: String,
    description: '发送成功',
  })
  async updateUserCaptcha(@UserInfo('email') address: string) {
    return await this.userService.updateCaptcha(address);
  }

  /**
   * 冻结用户
   */
  @Get('freeze')
  @RequireLogin()
  @ApiBearerAuth()
  @ApiQuery({
    name: 'id',
    description: 'userId',
    type: Number,
  })
  @ApiResponse({
    type: String,
    description: 'success',
  })
  async freeze(@Query('id') id: number) {
    return await this.userService.freezeUserById(id);
  }

  // 获取用户列表
  @Get('list')
  @RequireLogin()
  @ApiBearerAuth()
  @ApiQuery({
    name: 'pageNo',
    description: '第几页',
    type: Number,
  })
  @ApiQuery({
    name: 'pageSize',
    description: '每页多少条',
    type: Number,
  })
  @ApiQuery({
    name: 'username',
    description: '用户名',
    type: Number,
  })
  @ApiQuery({
    name: 'nickName',
    description: '昵称',
    type: Number,
  })
  @ApiQuery({
    name: 'email',
    description: '邮箱地址',
    type: Number,
  })
  @ApiResponse({
    description: '用户列表',
    type: UserListVo,
  })
  async list(
    @Query('pageNo', generateParseIntPipe('pageNo')) pageNo: number,
    @Query('pageSize', generateParseIntPipe('pageSize')) pageSize: number,
    @Query('username') username: string,
    @Query('nickName') nickName: string,
    @Query('email') email: string,
  ) {
    return await this.userService.findUsers(
      pageNo,
      pageSize,
      username,
      nickName,
      email,
    );
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
  @ApiBearerAuth()
  @ApiResponse({
    status: 200,
    description: 'success',
    type: UserDetailVo,
  })
  async info(@UserInfo('userId') userId: number) {
    const user = await this.userService.findUserDetailById(userId);
    const vo = createUserInfoVO(user);
    return vo;
  }
}
