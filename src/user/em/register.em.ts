import { HttpException, HttpStatus } from '@nestjs/common';
import { User } from '../entity/user.entity';
import { md5 } from 'src/utils/utils';
import { RegisterUserDto } from '../dto/register.dto';

export function validateCaptcha(captcha: string, redisCaptcha: string) {
  if (!captcha) {
    throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
  }

  if (captcha !== redisCaptcha) {
    throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
  }
}

export function validateRegisterUser(user: User) {
  if (user) {
    throw new HttpException('用户已存在', HttpStatus.BAD_REQUEST);
  }
}

export function createUser(user: RegisterUserDto) {
  const result = new User();
  result.username = user.username;
  result.password = md5(user.password);
  result.email = user.email;
  result.nickName = user.nickName;
  return result;
}
