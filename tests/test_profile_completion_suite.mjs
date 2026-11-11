import assert from 'node:assert/strict'
import { calculateProfileCompletion } from '../lib/profile/types.ts'

console.log('Testing Profile Completion System...')

// 1. Initial State (New user signs up / logs in)
const initialUser = {
  email: 'test@filemindhub.xyz',
  full_name: 'Test Researcher',
}
const initialResult = calculateProfileCompletion(initialUser)
console.log('1. Initial Signup Completion:', initialResult)
assert.equal(initialResult.percentage, 25, 'Initial signup completion must be exactly 25%')
assert.equal(initialResult.section1, true, 'Section 1 must be true initially')
assert.equal(initialResult.section2, false, 'Section 2 must be false initially')
assert.equal(initialResult.section3, false, 'Section 3 must be false initially')
assert.equal(initialResult.section4, false, 'Section 4 must be false initially')

// 2. Section 2 Completed (+25% -> 50%)
const withSection2 = {
  ...initialUser,
  occupation_role: 'Legal Counsel',
  institution: 'High Court & Arbitrations',
  primary_domain: 'Law, Contracts & Regulatory Compliance',
  document_volume: '15–50 documents/week',
}
const step2Result = calculateProfileCompletion(withSection2)
console.log('2. Step 2 Completion:', step2Result)
assert.equal(step2Result.percentage, 50, 'Step 2 completion must be exactly 50%')
assert.equal(step2Result.section1, true)
assert.equal(step2Result.section2, true)
assert.equal(step2Result.section3, false)
assert.equal(step2Result.section4, false)

// 3. Section 3 Completed (+25% -> 75%)
const withSection3 = {
  ...withSection2,
  preferred_ai_provider: 'Dual-Engine (Gemini 3.8 + NVIDIA NIM)',
  citation_precision: 'Page-Precise Academic Quotes',
  audio_voice_speed: 'Deepgram Neural (1.0x Normal)',
  email_digest: true,
}
const step3Result = calculateProfileCompletion(withSection3)
console.log('3. Step 3 Completion:', step3Result)
assert.equal(step3Result.percentage, 75, 'Step 3 completion must be exactly 75%')
assert.equal(step3Result.section1, true)
assert.equal(step3Result.section2, true)
assert.equal(step3Result.section3, true)
assert.equal(step3Result.section4, false)

// 4. Section 4 Completed (+25% -> 100%)
const withSection4 = {
  ...withSection3,
  biometric_hardware_vault: 'FIDO2 WebAuthn Hardware Passkey',
  vault_recovery_hint: 'Childhood mentor memory in Chandigarh',
  auto_lock_interval: '1 hour',
  zero_knowledge_ack: true,
}
const step4Result = calculateProfileCompletion(withSection4)
console.log('4. Step 4 Completion (100%):', step4Result)
assert.equal(step4Result.percentage, 100, 'Step 4 completion must be exactly 100%')
assert.equal(step4Result.section1, true)
assert.equal(step4Result.section2, true)
assert.equal(step4Result.section3, true)
assert.equal(step4Result.section4, true)

console.log('All profile completion assertions passed successfully!')
