# Hotel Plan System Revamp Strategy

## Current Schema Analysis

### Key Tables and Relationships

#### Tables referencing `plans_global`:
1. **plans_hotel**
   - `plans_global_id INT REFERENCES plans_global(id) ON DELETE SET NULL`
   - Links hotel-specific plans to their global templates

2. **hotel_plan_exclusions**
   - `global_plan_id INTEGER NOT NULL REFERENCES plans_global(id) ON DELETE CASCADE`
   - Tracks which global plans are excluded for specific hotels

3. **plans_rates**
   - `plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE`
   - Stores rate adjustments for global plans

4. **plan_addons**
   - `plans_global_id INT REFERENCES plans_global(id) ON DELETE CASCADE`
   - Links add-ons to global plans

5. **reservation_details**
   - `plans_global_id INT REFERENCES plans_global(id)`
   - Tracks which global plan was used in a reservation

6. **sc_tl_plans** (OTA Integration)
   - `plans_global_id INT REFERENCES plans_global(id)`
   - Used for OTA plan mapping

#### Tables referencing `plans_hotel`:
1. **plans_rates**
   - `plans_hotel_id INT`
   - `FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE`
   - Stores rate adjustments for hotel-specific plans

2. **plan_addons**
   - `plans_hotel_id INT`
   - `FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id) ON DELETE CASCADE`
   - Links add-ons to hotel-specific plans

3. **reservation_details**
   - `plans_hotel_id INT`
   - `FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)`
   - Tracks which hotel plan was used in a reservation

4. **sc_tl_plans** (OTA Integration)
   - `plans_hotel_id INT`
   - `FOREIGN KEY (plans_hotel_id, hotel_id) REFERENCES plans_hotel(id, hotel_id)`
   - Used for OTA plan mapping

## Current Challenges
1. Plans are currently managed globally
2. Need per-hotel Room-type specific plans display order configuration
3. Need to maintain plan comparability across hotels

## Proposed Solution: New Plan System with Room-Type Support

### New Database Schema

#### 1. Plan Categories
```sql
CREATE TABLE plan_categories (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    UNIQUE (name)
);
```

#### 2. Hotel Plans (Room Type Specific)
```sql
CREATE TABLE hotel_plans (
    id SERIAL,
    hotel_id INTEGER NOT NULL REFERENCES hotels(id) ON DELETE CASCADE,
    room_type_id INTEGER REFERENCES room_types(id) ON DELETE CASCADE,
    category_id INTEGER NOT NULL REFERENCES plan_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    plan_type TEXT CHECK (plan_type IN ('per_person', 'per_room')) NOT NULL DEFAULT 'per_room',
    color VARCHAR(7) CHECK (color ~ '^#[0-9A-Fa-f]{6}$') DEFAULT '#D3D3D3',
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by INT REFERENCES users(id),
    updated_by INT DEFAULT NULL REFERENCES users(id),
    PRIMARY KEY (hotel_id, id),
    UNIQUE (hotel_id, name, COALESCE(room_type_id, 0))
) PARTITION BY LIST (hotel_id);

-- Create index for better query performance
CREATE INDEX idx_hotel_plans_room_type ON hotel_plans(hotel_id, room_type_id) WHERE room_type_id IS NOT NULL;
```

#### 3. Plan Rates (Adapted from existing plans_rates)
```sql
-- Keep the existing plans_rates table but update foreign keys
ALTER TABLE plans_rates 
RENAME COLUMN plans_hotel_id TO hotel_plan_id;

-- Update foreign key to reference the new hotel_plans table
ALTER TABLE plans_rates 
DROP CONSTRAINT IF EXISTS plans_rates_plans_hotel_id_fkey;

ALTER TABLE plans_rates 
ADD CONSTRAINT fk_plans_rates_hotel_plan 
FOREIGN KEY (hotel_plan_id, hotel_id) 
REFERENCES hotel_plans(id, hotel_id) 
ON DELETE CASCADE;
```

#### 4. Plan Addons (Adapted from existing plan_addons)
```sql
-- Update plan_addons to work with the new schema
ALTER TABLE plan_addons 
RENAME COLUMN plans_hotel_id TO hotel_plan_id;

-- Update foreign key to reference the new hotel_plans table
ALTER TABLE plan_addons 
DROP CONSTRAINT IF EXISTS plan_addons_plans_hotel_id_fkey;

ALTER TABLE plan_addons 
ADD CONSTRAINT fk_plan_addons_hotel_plan
FOREIGN KEY (hotel_plan_id, hotel_id) 
REFERENCES hotel_plans(id, hotel_id)
ON DELETE CASCADE;

-- Add room_type_id to support room-type specific addons
ALTER TABLE plan_addons
ADD COLUMN room_type_id INTEGER REFERENCES room_types(id) ON DELETE CASCADE;

-- Update unique constraints if needed
ALTER TABLE plan_addons 
DROP CONSTRAINT IF EXISTS plan_addons_hotel_id_plans_hotel_id_addons_global_id_addons_hotel_id_key;

ALTER TABLE plan_addons
ADD CONSTRAINT unique_plan_addon 
UNIQUE (hotel_id, hotel_plan_id, COALESCE(addons_global_id, 0), COALESCE(addons_hotel_id, 0), COALESCE(room_type_id, 0));
```

### Migration Strategy

1. **Phase 1: Schema Creation**
   - Create new tables with the schema above
   - Set up necessary indexes and constraints
   - Create database functions/triggers if needed

2. **Phase 2: Data Migration**
   - Migrate existing plans to the new structure
   - Map existing plan types to categories
   - Preserve historical data relationships
   - Remove the `hotel_plan_exclusions` table as it will no longer be needed (exclusions will be handled by room-type specific plan assignments)

3. **Phase 3: Application Updates**
   - Update data access layer to use new tables
   - Create new API endpoints for plan management
   - Implement new UI for room-type specific plans

# Implementation Plan

- [ ] 1. Database Schema Updates
  - [ ] 1.1 Create new plan_categories table
    - Include fields: id, name, description, color, display_order
    - Add audit fields (created_at, updated_at, created_by, updated_by)
    - _Requirements: Support room-type specific plans, maintain plan comparability_

  - [ ] 1.2 Create new hotel_plans table
    - Include fields: id, hotel_id, room_type_id, category_id, name, description, color, display_order
    - Add foreign keys and constraints
    - _Requirements: Room-type specificity, display ordering, color theming_

  - [ ] 1.3 Update plans_rates table
    - Add new foreign keys to hotel_plans
    - Maintain backward compatibility during transition
    - _Requirements: Support both old and new schema during migration_

  - [ ] 1.4 Update plan_addons table
    - Add room_type_id and update constraints
    - Ensure proper foreign key relationships
    - _Requirements: Support room-type specific addons_

  - [ ] 1.5 Remove hotel_plan_exclusions table
    - Create migration to drop table after data migration
    - Update any dependent views or functions
    - _Requirements: Clean removal after migration_

- [ ] 2. Data Migration
  - [ ] 2.1 Migrate global plans to categories
    - Create categories from distinct plan types
    - Preserve color schemes and naming conventions
    - _Requirements: Maintain data integrity, preserve relationships_

  - [ ] 2.2 Migrate hotel plans
    - Map existing plans to new structure
    - Handle room-type assignments
    - _Requirements: Ensure no data loss, maintain relationships_

  - [ ] 2.3 Migrate plan rates and addons
    - Update references to use new plan structure
    - Handle room-type specific mappings
    - _Requirements: Maintain rate calculations, preserve addon relationships_

### Data Migration Details

Here are the detailed steps and example SQL queries for the data migration. Note that these are examples and may need to be adapted for the specific production environment.

#### 2.1 Migrate Global Plans to Categories

First, we'll populate the `plan_categories` table by selecting the distinct plan names from the old `plans_global` table.

```sql
INSERT INTO plan_categories (name, description, color, display_order, created_by)
SELECT 
    name,
    description,
    COALESCE(color, '#D3D3D3'),
    display_order,
    1 -- Or the ID of a default system user
FROM plans_global;
```

#### 2.2 Migrate Hotel Plans

Next, we'll migrate the existing `plans_hotel` data into the new `hotel_plans` table. This query assumes that the old `plans_hotel` has a `plans_global_id` to link back to the global plan, which we use to find the new `category_id`.

```sql
INSERT INTO hotel_plans (hotel_id, category_id, name, description, plan_type, color, display_order, is_active, created_by)
SELECT
    ph.hotel_id,
    pc.id AS category_id,
    ph.name,
    ph.description,
    'per_room', -- Or derive from existing data if available
    COALESCE(ph.color, '#D3D3D3'),
    ph.display_order,
    ph.is_active,
    1 -- Or the ID of a default system user
FROM plans_hotel ph
JOIN plans_global pg ON ph.plans_global_id = pg.id
JOIN plan_categories pc ON pg.name = pc.name;
```

*Note: This example assumes all migrated plans are hotel-level (`room_type_id` is NULL). If you have room-type specific plans in the old schema, you'll need to adjust this query to include the `room_type_id`.*

#### 2.3 Migrate Plan Rates and Addons

After migrating the plans, we need to update the `plans_rates` and `plan_addons` tables to reference the new `hotel_plans` table. This is more of an `UPDATE` operation than an `INSERT`.

First, you would need to add a temporary column to `plans_hotel` to store the new `hotel_plan_id` after the migration.

```sql
ALTER TABLE plans_hotel ADD COLUMN new_hotel_plan_id INT;

-- After running the hotel_plans migration, populate this new column
UPDATE plans_hotel ph
SET new_hotel_plan_id = (
    SELECT hp.id 
    FROM hotel_plans hp
    WHERE hp.hotel_id = ph.hotel_id AND hp.name = ph.name AND hp.room_type_id IS NULL
);

-- Now, update plans_rates
UPDATE plans_rates pr
SET hotel_plan_id = (
    SELECT ph.new_hotel_plan_id
    FROM plans_hotel ph
    WHERE pr.hotel_plan_id = ph.id AND pr.hotel_id = ph.hotel_id
);

-- And update plan_addons
UPDATE plan_addons pa
SET hotel_plan_id = (
    SELECT ph.new_hotel_plan_id
    FROM plans_hotel ph
    WHERE pa.hotel_plan_id = ph.id AND pa.hotel_id = ph.hotel_id
);

-- Finally, you can drop the temporary column
ALTER TABLE plans_hotel DROP COLUMN new_hotel_plan_id;

```

- [ ] 3. API and Service Layer Updates
  - [ ] 3.1 Create new endpoints for plan management
    - CRUD operations for plan categories
    - Room-type specific plan management
    - _Requirements: Support new schema, maintain backward compatibility_

  - [ ] 3.2 Update existing plan-related services
    - Modify plan retrieval to use new structure
    - Update rate calculation logic
    - _Requirements: Ensure consistent behavior with new schema_

- [ ] 4. Frontend Updates
  - [ ] 4.1 Update plan management UI
    - Add room-type selection
    - Implement drag-and-drop ordering
    - _Requirements: Intuitive interface, responsive design_

  - [ ] 4.2 Update reservation flow
    - Handle room-type specific plan selection
    - Update rate display and calculation
    - _Requirements: Seamless user experience_

- [ ] 5. Testing and Validation
  - [ ] 5.1 Database migration testing
    - Verify data integrity after migration
    - Test edge cases and error conditions
    - _Requirements: No data loss, all relationships preserved_

  - [ ] 5.2 Integration testing
    - Test all plan-related functionality
    - Verify rate calculations
    - _Requirements: All features work as expected_

- [ ] 6. Deployment Strategy
  - [ ] 6.1 Create rollback procedures
  - [ ] 6.2 Prepare database migration scripts
  - [ ] 6.3 Schedule maintenance window
  - _Requirements: Minimal downtime, rollback capability_
## Backend Implementation

- [ ] 7. Plan Management API Updates
  - [ ] 7.1 Update plan CRUD operations
    - Modify create/update/delete endpoints for new schema
    - Add room-type specific plan management
    - Ensure proper validation and error handling
    - _Requirements: Maintain backward compatibility, handle room-type specifics_

  - [ ] 7.2 Display order management
    - Create endpoints for updating plan display order
    - Implement bulk update for reordering
    - Add validation for order uniqueness
    - _Requirements: Atomic updates, proper error handling_

  - [ ] 7.3 Plan retrieval optimization
    - Update plan listing endpoints to respect display order
    - Add filtering by room type
    - Optimize queries for performance
    - _Requirements: Fast response times, proper sorting_

  - [ ] 7.4 Validation and security
    - Add validation for plan category assignments
    - Implement proper authorization checks
    - Add rate limiting for order updates
    - _Requirements: Security, data integrity_

## Frontend Implementation

- [ ] 8. Plan Management Interface
  - [ ] 8.1 Plan list view
    - Display plans organized by categories
    - Show room-type specific indicators
    - Implement filtering and search
    - _Requirements: Responsive design, intuitive navigation_

  - [ ] 8.2 Drag-and-drop ordering
    - Implement drag handles for reordering
    - Visual feedback during drag operations
    - Save order on drop
    - _Requirements: Smooth UX, immediate feedback_

  - [ ] 8.3 Room-type specific overrides
    - Toggle for room-type specific ordering
    - Visual indicators for overridden orders
    - Easy switching between room types
    - _Requirements: Clear visual hierarchy_

  - [ ] 8.4 Plan comparison
    - Side-by-side plan comparison view
    - Highlight differences between plans
    - Responsive layout for all devices
    - _Requirements: Readable comparison, mobile-friendly_

## Testing and Rollout

- [ ] 9. Testing Strategy
  - [ ] 9.1 Unit tests
    - Test all new backend services
    - Test frontend components
    - _Requirements: 80%+ code coverage_

  - [ ] 9.2 Integration tests
    - Test API endpoints
    - Test database interactions
    - _Requirements: All critical paths covered_

  - [ ] 9.3 E2E testing
    - Test complete user flows
    - Verify data consistency
    - _Requirements: Happy paths and error cases_

- [ ] 10. Deployment
  - [ ] 10.1 Staging deployment
    - Deploy to staging environment
    - Perform smoke tests
    - _Requirements: Verify all functionality_

  - [ ] 10.2 Production rollout
    - Create rollback plan
    - Schedule maintenance window
    - Deploy in phases
    - _Requirements: Minimal downtime, rollback capability_

  - [ ] 10.3 Monitoring
    - Set up monitoring for new endpoints
    - Monitor database performance
    - Track error rates
    - _Requirements: Proactive issue detection_

## Benefits
1. **Flexibility**: Per-hotel plan customization
2. **Consistency**: Maintain comparability through categories
3. **Scalability**: Easy to add room-type specific plans
4. **Maintainability**: Clear separation of concerns

## Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| **Data Migration Failure** | Medium | High | - Wrap migration in a transaction<br>- Perform dry runs on staging<br>- Test rollback procedures |
| **Performance Degradation** | Medium | High | - Benchmark queries on staging<br>- Optimize indexes and queries<br>- Monitor performance post-deployment |
| **User Confusion** | Low | Medium | - Conduct UAT with pilot users<br>- Provide training and documentation<br>- Gather feedback post-launch |

## Plan Comparability

Plan comparability will be maintained through the `plan_categories` table. Plans belonging to the same category are considered comparable across different hotels and room types. This allows for consistent reporting and filtering, even with per-hotel customizations. The `display_order` field within the category will provide a default sorting, which can be overridden at the hotel or room-type level.

## Future Considerations
1. Plan versioning
2. Seasonal plan variations
3. Advanced pricing rules
4. Multi-language support for categories

## Migration Strategy
1. Deploy database changes
2. Run one-time data migration
3. Deploy backend changes
4. Update frontend components
5. Monitor and validate data integrity
