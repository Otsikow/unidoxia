import { Webhook } from 'npm:svix@2.9.1';
import {studentEmailEventVerifier} from '../_shared/studentEmailEventVerification.ts';
export const verifyStudentEmailEvent=studentEmailEventVerifier(Webhook);
