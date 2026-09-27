import { RegistrationDraft } from '../models/registration-draft';

export const createRegistrationState = (): RegistrationDraft => ({
  name: '', id: '', birthDate: '', age: null, gender: 'Masculino', birthProvince: '', birthCity: '',
  selfIdentification: '', hasDisability: 'No', disabilityType: '', role: 'beneficiary', phone: '', email: '',
  address: '', sector: '', latitude: null, longitude: null, institution: '', career: '', education: '', level: '1',
  motivation: '', skills: '', volunteer: 'No', volunteerDetails: '', password: '', days: [], schedules: [],
  availabilitySlots: [], terms: false
});
