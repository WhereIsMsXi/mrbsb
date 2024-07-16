import { HttpException, HttpStatus } from '@nestjs/common';

export function validateUpdatePasswordCaptcha(
  captcha: string,
  redisCaptcha: string,
) {
  if (!captcha) {
    throw new HttpException('验证码已失效', HttpStatus.BAD_REQUEST);
  }

  if (captcha !== redisCaptcha) {
    throw new HttpException('验证码不正确', HttpStatus.BAD_REQUEST);
  }
}
