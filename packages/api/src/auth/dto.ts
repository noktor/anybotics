import { IsEmail, IsString, MinLength, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@anybotics.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'admin123' })
  @IsString()
  @MinLength(6)
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'operator@anybotics.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password!: string;

  @ApiProperty({ example: 'Jane Operator' })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'operator', required: false })
  @IsOptional()
  @IsIn(['admin', 'operator', 'maintenance_engineer', 'viewer'])
  role?: string;
}
