  // In store/index.ts — replace the createExpense action with this version
  // that returns the new expense id so the form can upload attachments to it.
  //
  // DIFF: only createExpense changes — everything else stays the same.
  //
  // Replace this block in your store:
  //
  // createExpense: async (data) => {
  //   const { currentFamily } = get()
  //   if (!currentFamily) return
  //   const res = await API('/api/expenses', {
  //     method: 'POST',
  //     body: JSON.stringify({ ...data, familyId: currentFamily.id }),
  //   })
  //   if (!res.ok) {
  //     const err = await res.json().catch(() => ({}))
  //     throw new Error(err.error || 'Failed to create expense')
  //   }
  //   get().loadExpenses()
  // },
  //
  // With this:

  createExpense: async (data) => {
    const { currentFamily } = get()
    if (!currentFamily) return null
    const res = await API('/api/expenses', {
      method: 'POST',
      body: JSON.stringify({ ...data, familyId: currentFamily.id }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Failed to create expense')
    }
    const result = await res.json()
    get().loadExpenses()
    return result.expense?.id ?? null   // <-- returns the new expense id
  },
