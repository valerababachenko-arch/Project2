Plan: Migrate frontend from Cats -> Recipes

Goal
- Update the frontend form and rendering to use the `Recipes` Prisma model (fields: id, calories, description, ingredients, proteinGrams, steps, title, type).

Steps
1. Inspect the Prisma schema to confirm field names and types.
   - Found model `Recipes` with fields: `id` (String), `calories` (Int), `description` (String), `ingredients` (String), `proteinGrams` (Int), `steps` (String), `title` (String), `type` (String).

2. Update `public/index.html` form to collect recipe data.
   - Replace cat fields with: `title`, `type`, `calories`, `proteinGrams`, `ingredients`, `steps`, `description`, and hidden `id`.
   - Keep validations for required fields (title, ingredients, steps).

3. Update `public/script.js` to handle recipes.
   - Ensure `getFormData()` continues to turn number inputs into numbers.
   - Update `renderItem()` to display `title`, `type`, `calories`, `proteinGrams`, `ingredients` (split into list), `steps`, and `description`.
   - Update `editItem()` and default/reset headings to reference recipes.
   - Fix create-button reset handler bug (avoid immediate invocation).

4. Update API reference to use Prisma `recipes` model.
   - Replace `prisma[model]` usage with `prisma.recipes` and update search to query `title`.

5. Sanity check and manual testing.
   - Run the server and test: GET `/data`, POST `/data`, PUT `/data/:id`, DELETE `/data/:id` using the new form.
   - Verify data saved in MongoDB matches the schema fields.

Notes / Next steps
- The backend Prisma model property is referenced as `prisma.recipes` in `routes/api.js`.
- The `ingredients` and `steps` fields are stored as strings; the UI treats `ingredients` as a comma-separated list and `steps` as free text (preformatted).
- If you want structured arrays in the database, consider updating the Prisma schema and client usage accordingly.
