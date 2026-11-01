import assert from 'node:assert'
import fs from 'node:fs'
import path from 'node:path'

async function run() {
  console.log('Testing Navigation and Auth Redirects...')

  const resHome = await fetch('http://localhost:3000/', { redirect: 'manual' })
  assert.strictEqual(resHome.status, 200, 'GET / must return 200 (not redirect)')
  assert.strictEqual(resHome.headers.get('location'), null, 'GET / must not have location header')
  const htmlHome = await resHome.text()
  assert.ok(htmlHome.includes('Your Documents.'), 'Home must contain landing page headline')
  assert.ok(htmlHome.includes('Get Started'), 'Home must contain Get Started button')
  assert.ok(htmlHome.includes('Sign In'), 'Home must contain Sign In button')
  console.log('PASS: Flow 1 - Opening / displays landing page without automatic redirect')

  const resDash = await fetch('http://localhost:3000/dashboard', { redirect: 'manual' })
  assert.strictEqual(resDash.status, 307, 'GET /dashboard must return 307 redirect for unauthenticated user')
  const dashLoc = resDash.headers.get('location')
  assert.ok(dashLoc.includes('/login'), 'Unauthenticated /dashboard must redirect to login')
  assert.ok(dashLoc.includes('next='), 'Unauthenticated /dashboard must preserve next param')
  console.log('PASS: Flow 2 - Unauthenticated workspace access redirects to login preserving destination:', dashLoc)

  const resLogin = await fetch('http://localhost:3000/login', { redirect: 'manual' })
  assert.strictEqual(resLogin.status, 200, 'GET /login must return 200')
  const resSignup = await fetch('http://localhost:3000/signup', { redirect: 'manual' })
  assert.strictEqual(resSignup.status, 200, 'GET /signup must return 200')
  console.log('PASS: Flow 3 - Direct /login and /signup routes accessible')

  const loginSrc = fs.readFileSync(path.join(process.cwd(), 'components/auth/LoginForm.tsx'), 'utf8')
  assert.ok(loginSrc.includes("nextParam && nextParam.startsWith('/')"), 'LoginForm must sanitize nextParam')
  assert.ok(loginSrc.includes('router.push(destination)'), 'LoginForm must redirect to destination (not hardcoded /dashboard)')
  assert.ok(loginSrc.includes('next={nextParam || undefined}'), 'LoginForm must pass nextParam to GoogleSignInButton')

  const signupSrc = fs.readFileSync(path.join(process.cwd(), 'components/auth/SignupForm.tsx'), 'utf8')
  assert.ok(signupSrc.includes("nextParam && nextParam.startsWith('/')"), 'SignupForm must sanitize nextParam')
  assert.ok(signupSrc.includes('router.push(destination)'), 'SignupForm must redirect to destination (not hardcoded /dashboard)')

  const googleSrc = fs.readFileSync(path.join(process.cwd(), 'components/auth/GoogleSignInButton.tsx'), 'utf8')
  assert.ok(googleSrc.includes("callbackUrl.searchParams.set('next', next)"), 'GoogleSignInButton must attach next param to callback URL')

  const cbSrc = fs.readFileSync(path.join(process.cwd(), 'app/auth/callback/route.ts'), 'utf8')
  assert.ok(cbSrc.includes("const nextParam = searchParams.get('next')"), 'Auth callback must inspect next param')
  assert.ok(cbSrc.includes("? nextParam\n    : '/'") || cbSrc.includes("? nextParam : '/'"), 'Auth callback must default to / when nextParam is absent')

  const sidebarSrc = fs.readFileSync(path.join(process.cwd(), 'components/layout/Sidebar.tsx'), 'utf8')
  assert.ok(sidebarSrc.includes("router.push('/')"), 'Sidebar logout must return user to /')

  const mobileNavSrc = fs.readFileSync(path.join(process.cwd(), 'components/layout/MobileNav.tsx'), 'utf8')
  assert.ok(mobileNavSrc.includes("router.push('/')"), 'MobileNav logout must return user to /')

  console.log('\nAll Navigation and Auth Redirect Verification Checks Passed Successfully!')
}

run().catch((err) => {
  console.error('Verification failed:', err)
  process.exit(1)
})
