-- Los códigos nuevos los arma la aplicación (3 letras de la sucursal + 6 dígitos).
-- Los que ya eran solo números se completan con las letras de su sucursal.
UPDATE "Order" AS o
SET code = rpad(
  upper(
    substring(
      regexp_replace(
        translate(b.name, 'áéíóúüÁÉÍÓÚÜñÑ', 'aeiouuAEIOUUnN'),
        '[^A-Za-z]',
        '',
        'g'
      )
      from 1 for 3
    )
  ),
  3,
  'X'
) || o.code
FROM "Branch" b
WHERE o."branchId" = b.id
  AND o.code ~ '^\d{6}$';
