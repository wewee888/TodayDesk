export async function onRequestGet(context: any): Promise<Response> {
  const { request, env } = context;
  const url = new URL(request.url);
  const account = url.searchParams.get('account') || 'lizihan';

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, error: 'D1 DB not bound' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const userRes = await env.DB.prepare('SELECT * FROM users WHERE account = ?')
      .bind(account)
      .first();

    const settingsRes = await env.DB.prepare('SELECT * FROM desk_settings WHERE account = ?')
      .bind(account)
      .first();

    const tasksRes = await env.DB.prepare(
      'SELECT * FROM homework_tasks WHERE account = ? ORDER BY created_at DESC LIMIT 100'
    )
      .bind(account)
      .all();

    const schedulesRes = await env.DB.prepare(
      'SELECT * FROM routine_schedules WHERE account = ? ORDER BY created_at DESC'
    )
      .bind(account)
      .all();

    const mistakesRes = await env.DB.prepare(
      'SELECT * FROM mistakes WHERE account = ? ORDER BY created_at DESC LIMIT 50'
    )
      .bind(account)
      .all();

    const examRes = await env.DB.prepare(
      'SELECT * FROM exam_scores WHERE account = ? ORDER BY created_at DESC'
    )
      .bind(account)
      .all();

    let deskSettings = null;
    if (settingsRes) {
      try {
        deskSettings = {
          studentName: userRes?.student_name || '李子涵',
          gradeClass: userRes?.grade_class || '初二 (3) 班',
          pomodoroMinutes: settingsRes.pomodoro_minutes || 25,
          peExercises: JSON.parse(settingsRes.pe_exercises || '[]'),
          extracurricularActivities: JSON.parse(settingsRes.extracurricular_activities || '[]'),
          customSubjects: JSON.parse(settingsRes.custom_subjects || '[]'),
          activityConfigs: JSON.parse(settingsRes.activity_configs || '{}'),
        };
      } catch {}
    }

    return new Response(
      JSON.stringify({
        ok: true,
        account,
        profile: userRes
          ? {
              account: userRes.account,
              studentName: userRes.student_name,
              gradeClass: userRes.grade_class,
              role: userRes.role,
              targetGoal: userRes.target_goal,
            }
          : null,
        deskSettings,
        homeworkTasks: (tasksRes?.results || []).map((t: any) => ({
          id: t.id,
          subject: t.subject,
          taskType: t.task_type,
          title: t.title,
          estimatedMinutes: t.estimated_minutes,
          completed: Boolean(t.completed),
          completedPomodoros: t.completed_pomodoros || 0,
        })),
        schedules: (schedulesRes?.results || []).map((s: any) => ({
          id: s.id,
          title: s.title,
          timeText: s.time_text,
          tag: s.tag,
          tagClass: s.tag_class,
          icon: s.icon,
          completed: Boolean(s.completed),
          attendanceStatus: s.attendance_status || 'active',
          leaveNote: s.leave_note || undefined,
        })),
        mistakes: (mistakesRes?.results || []).map((m: any) => ({
          id: m.id,
          subject: m.subject,
          sourceLabel: m.source_label,
          title: m.title,
          reasonText: m.reason_text,
          excerpt: m.excerpt,
          solutionDetail: m.solution_detail,
          imageUrl: m.image_url,
          cleared: Boolean(m.cleared),
        })),
        examScores: examRes?.results || [],
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function onRequestPost(context: any): Promise<Response> {
  const { request, env } = context;

  if (!env.DB) {
    return new Response(JSON.stringify({ ok: false, error: 'D1 DB not bound' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const payload = await request.json();
    const account = payload.account || 'lizihan';
    const profile = payload.profile;
    const deskSettings = payload.deskSettings;
    const homeworkTasks = Array.isArray(payload.homeworkTasks) ? payload.homeworkTasks : [];
    const schedules = Array.isArray(payload.schedules) ? payload.schedules : [];
    const mistakes = Array.isArray(payload.mistakes) ? payload.mistakes : [];
    const examDataMap = payload.examDataMap;

    const statements: any[] = [];

    // Support one-click purge of all mock data for this account
    if (payload.purgeMockData === true) {
      statements.push(
        env.DB.prepare('DELETE FROM homework_tasks WHERE account = ?').bind(account)
      );
      statements.push(
        env.DB.prepare('DELETE FROM routine_schedules WHERE account = ?').bind(account)
      );
      statements.push(
        env.DB.prepare('DELETE FROM mistakes WHERE account = ?').bind(account)
      );
    }

    if (payload.clearAllTasks === true) {
      statements.push(
        env.DB.prepare('DELETE FROM homework_tasks WHERE account = ?').bind(account)
      );
    }
    if (payload.clearAllSchedules === true) {
      statements.push(
        env.DB.prepare('DELETE FROM routine_schedules WHERE account = ?').bind(account)
      );
    }
    if (payload.clearAllMistakes === true) {
      statements.push(
        env.DB.prepare('DELETE FROM mistakes WHERE account = ?').bind(account)
      );
    }
    if (payload.deletedTaskId) {
      statements.push(
        env.DB.prepare('DELETE FROM homework_tasks WHERE id = ? AND account = ?').bind(
          payload.deletedTaskId,
          account
        )
      );
    }
    if (payload.deletedScheduleId) {
      statements.push(
        env.DB.prepare('DELETE FROM routine_schedules WHERE id = ? AND account = ?').bind(
          payload.deletedScheduleId,
          account
        )
      );
    }
    if (payload.deletedMistakeId) {
      statements.push(
        env.DB.prepare('DELETE FROM mistakes WHERE id = ? AND account = ?').bind(
          payload.deletedMistakeId,
          account
        )
      );
    }

    // 1. Upsert User
    if (profile) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO users (account, student_name, grade_class, role, target_goal, updated_at)
           VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(account) DO UPDATE SET
             student_name = excluded.student_name,
             grade_class = excluded.grade_class,
             role = excluded.role,
             target_goal = excluded.target_goal,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(
          account,
          profile.studentName || '李子涵',
          profile.gradeClass || '初二 (3) 班',
          profile.role || 'student',
          profile.targetGoal || ''
        )
      );
    }

    // 2. Upsert Desk Settings
    if (deskSettings) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO desk_settings (account, pomodoro_minutes, pe_exercises, extracurricular_activities, custom_subjects, activity_configs, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(account) DO UPDATE SET
             pomodoro_minutes = excluded.pomodoro_minutes,
             pe_exercises = excluded.pe_exercises,
             extracurricular_activities = excluded.extracurricular_activities,
             custom_subjects = excluded.custom_subjects,
             activity_configs = excluded.activity_configs,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(
          account,
          deskSettings.pomodoroMinutes || 25,
          JSON.stringify(deskSettings.peExercises || []),
          JSON.stringify(deskSettings.extracurricularActivities || []),
          JSON.stringify(deskSettings.customSubjects || []),
          JSON.stringify(deskSettings.activityConfigs || {})
        )
      );
    }

    // 3. Upsert Tasks
    for (const task of homeworkTasks) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO homework_tasks (id, account, subject, task_type, title, estimated_minutes, completed, completed_pomodoros, task_date, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
           ON CONFLICT(id) DO UPDATE SET
             subject = excluded.subject,
             task_type = excluded.task_type,
             title = excluded.title,
             estimated_minutes = excluded.estimated_minutes,
             completed = excluded.completed,
             completed_pomodoros = excluded.completed_pomodoros,
             updated_at = CURRENT_TIMESTAMP`
        ).bind(
          task.id,
          account,
          task.subject || '自习',
          task.taskType || '作业',
          task.title || '',
          task.estimatedMinutes || 15,
          task.completed ? 1 : 0,
          task.completedPomodoros || 0,
          task.taskDate || new Date().toISOString().slice(0, 10)
        )
      );
    }

    // 4. Upsert Mistakes
    for (const m of mistakes) {
      statements.push(
        env.DB.prepare(
          `INSERT INTO mistakes (id, account, subject, source_label, title, reason_text, excerpt, solution_detail, image_url, cleared)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(id) DO UPDATE SET
             cleared = excluded.cleared,
             reason_text = excluded.reason_text,
             solution_detail = excluded.solution_detail,
             image_url = excluded.image_url`
        ).bind(
          m.id,
          account,
          m.subject || '综合',
          m.sourceLabel || '',
          m.title || '',
          m.reasonText || '',
          m.excerpt || '',
          m.solutionDetail || '',
          m.imageUrl || null,
          m.cleared ? 1 : 0
        )
      );
    }

    // 5. Batch execute all statements in a transaction
    if (statements.length > 0) {
      await env.DB.batch(statements);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        syncedCount: statements.length,
        syncedAt: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (err: any) {
    return new Response(JSON.stringify({ ok: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
