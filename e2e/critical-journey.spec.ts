import { test, expect } from '@playwright/test'

/**
 * ProjectFlow Critical User Journey E2E Test Suite
 * 
 * Journey:
 * 1. Sign in or register with test user credentials
 * 2. Create organization (if in onboarding)
 * 3. Create a project
 * 4. Create a task
 * 5. Move a task to Done
 * 6. Add a comment to the task
 * 7. Verify notification UI behavior in NotificationCenter
 * 
 * IMPORTANT:
 * - Credentials are read ONLY from TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables.
 * - Never use real production credentials or data.
 * - In CI / staging environments, supply dedicated test user credentials.
 */

const TEST_EMAIL = process.env.TEST_USER_EMAIL
const TEST_PASSWORD = process.env.TEST_USER_PASSWORD
const TEST_ORG_NAME = process.env.TEST_ORG_NAME || `Test Workspace ${Date.now().toString().slice(-4)}`
const TEST_PROJECT_NAME = `Demo Project ${Date.now().toString().slice(-4)}`
const TEST_TASK_TITLE = `Critical Task ${Date.now().toString().slice(-4)}`
const TEST_COMMENT_TEXT = `Automated verification comment ${Date.now()}`

test.describe('Critical User Journey', () => {
  test.beforeEach(async () => {
    if (!TEST_EMAIL || !TEST_PASSWORD) {
      test.skip(
        true,
        'Skipping E2E journey: TEST_USER_EMAIL and TEST_USER_PASSWORD environment variables are not configured. Refer to README.md and docs/DEPLOYMENT.md for setup instructions.'
      )
    }
  })

  test('executes end-to-end flow from sign-in to task completion and comment notifications', async ({
    page,
  }) => {
    // 1. Sign in
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await page.fill('input[type="email"]', TEST_EMAIL!)
    await page.fill('input[type="password"]', TEST_PASSWORD!)
    await page.click('button[type="submit"]')

    // Wait for redirect to dashboard or onboarding
    await page.waitForURL(/\/(dashboard|onboarding)/)

    // 2. Organization Onboarding (if new account)
    if (page.url().includes('/onboarding')) {
      await page.fill('input[name="name"], input#org-name', TEST_ORG_NAME)
      await page.click('button[type="submit"]')
      await page.waitForURL(/\/dashboard/)
    }

    // Verify Dashboard loaded
    await expect(page.locator('h1')).toBeVisible()

    // 3. Create a project
    await page.goto('/projects')
    await page.waitForLoadState('networkidle')

    // Click "New Project" / "Create Project"
    const createProjectBtn = page.getByRole('button', { name: /(New Project|Create Project)/i }).first()
    await createProjectBtn.click()

    // Fill project form
    await page.fill('input#project-name', TEST_PROJECT_NAME)
    await page.fill('textarea#project-desc', 'Automated E2E test project description')
    await page.click('button[type="submit"]')

    // Verify project appears in list
    const projectCard = page.getByText(TEST_PROJECT_NAME)
    await expect(projectCard).toBeVisible()

    // 4. Navigate into project and create a task
    await projectCard.click()
    await page.waitForURL(/\/projects\/.+/)

    // Click Create Task
    const createTaskBtn = page.getByRole('button', { name: /Create Task/i })
    await createTaskBtn.click()

    await page.fill('input#task-title', TEST_TASK_TITLE)
    await page.fill('textarea#task-desc', 'Task created via automated E2E journey')
    await page.click('button[type="submit"]')

    // Verify task card appears
    const taskElement = page.getByText(TEST_TASK_TITLE)
    await expect(taskElement).toBeVisible()

    // 5. Move task to Done
    // Click task status selector or open drawer and change status to done
    await taskElement.click()
    const taskDrawer = page.getByRole('dialog')
    await expect(taskDrawer).toBeVisible()

    const statusSelect = taskDrawer.locator('select#drawer-status')
    if (await statusSelect.isVisible()) {
      await statusSelect.selectOption('done')
      const saveBtn = taskDrawer.getByRole('button', { name: /Save Changes/i })
      await saveBtn.click()
    }

    // 6. Add comment to task
    // Ensure drawer is open on the task
    const commentsTab = taskDrawer.getByRole('button', { name: /Comments/i })
    await commentsTab.click()

    const commentInput = taskDrawer.locator('textarea[placeholder*="comment" i]')
    await commentInput.fill(TEST_COMMENT_TEXT)
    const postCommentBtn = taskDrawer.getByRole('button', { name: /Send|Post|Comment/i })
    await postCommentBtn.click()

    // Verify comment appears in timeline
    await expect(taskDrawer.getByText(TEST_COMMENT_TEXT)).toBeVisible()

    // Close task drawer
    const closeDrawerBtn = taskDrawer.getByRole('button', { name: /Close drawer/i })
    await closeDrawerBtn.click()

    // 7. Verify Notification UI behavior
    const bellBtn = page.getByRole('button', { name: /Notifications/i })
    await expect(bellBtn).toBeVisible()
    await bellBtn.click()

    // Verify notification panel opens
    const notificationPanel = page.getByRole('dialog', { name: /Notifications Panel/i })
    await expect(notificationPanel).toBeVisible()
    await expect(notificationPanel.getByText('Notifications')).toBeVisible()
  })
})

