# Storage Setup

## Banners Bucket

Created bucket `banners` for banner ad images.

**Policies:**
- Authenticated users can upload
- Public can view
- Only admins can delete

**Usage:**
- Upload path: `banners/{businessId}/{timestamp}.{ext}`
- Public URL: `{supabase_url}/storage/v1/object/public/banners/{path}`

## Technical Details

### Bucket Configuration
- **Bucket ID:** `banners`
- **Public:** Yes (allows direct access without authentication)
- **Type:** STANDARD

### Storage Policies

#### 1. Upload Policy
```sql
CREATE POLICY "Authenticated users can upload banners"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'banners');
```
Any authenticated user can upload banner images to this bucket.

#### 2. View Policy
```sql
CREATE POLICY "Public can view banners"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'banners');
```
Public access for viewing banner images (required for displaying ads on the platform).

#### 3. Delete Policy
```sql
CREATE POLICY "Admins can delete banners"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'banners'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
      AND (role = 'admin' OR is_super_admin = true)
  )
);
```
Only users with `role = 'admin'` or `is_super_admin = true` can delete banner images.

## File Organization

Banner images should be organized by business ID and timestamp to avoid conflicts:

```
banners/
  ├── {businessId}/
  │   ├── {timestamp_1}.jpg
  │   ├── {timestamp_2}.png
  │   └── ...
  └── ...
```

Example:
```
banners/123/1710907200000.jpg
banners/456/1710993600000.png
```

## Access Examples

### Upload (Client-side)
```typescript
const { data, error } = await supabase.storage
  .from('banners')
  .upload(`${businessId}/${Date.now()}.${ext}`, file);
```

### Get Public URL
```typescript
const { data } = supabase.storage
  .from('banners')
  .getPublicUrl(path);

console.log(data.publicUrl);
// https://{project}.supabase.co/storage/v1/object/public/banners/{businessId}/{timestamp}.jpg
```

### Delete (Admin only)
```typescript
const { error } = await supabase.storage
  .from('banners')
  .remove([path]);
```
