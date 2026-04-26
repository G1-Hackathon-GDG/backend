# Favorites API

This document covers only the favorites endpoints exposed under `/api/favorites`.

## Overview

- Base path: `/api/favorites`
- All favorites endpoints require authentication.
- Send the access token in the `Authorization` header:

```http
Authorization: Bearer <ACCESS_TOKEN>
```

- The access token is obtained from the authentication flow, for example after login. The auth endpoints themselves are out of scope for this document.

## Postman Reference

You can also explore the API in Postman here:

- https://documenter.getpostman.com/view/50380967/2sBXinGVP1

## Authentication

If the request is missing a valid Bearer token, the API returns `401 Unauthorized`.

Known authentication responses from `authMiddleware`:

| Condition | Status | Response |
| --- | --- | --- |
| No token provided | `401` | `{ "success": false, "message": "Access denied. No token provided. Please log in." }` |
| Token expired | `401` | `{ "success": false, "message": "Session expired. Please log in again." }` |
| Invalid token | `401` | `{ "success": false, "message": "Invalid token. Please log in again." }` |
| Token is valid but the user no longer exists | `401` | `{ "success": false, "message": "User no longer exists." }` |

## Endpoints

### `GET /api/favorites`

Returns the authenticated user's favorite items.

#### Request

```bash
curl -X GET http://localhost:5000/api/favorites \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Success Response

- Status: `200 OK`

```json
{
  "success": true,
  "count": 1,
  "data": [
    {
      "_id": "<FAVORITE_ID>",
      "userId": "<USER_ID>",
      "menuItemId": {
        "_id": "<MENU_ITEM_ID>",
        "name": "Margherita Pizza",
        "description": "Classic pizza with tomato and mozzarella.",
        "price": 12.99,
        "category": "Pizza",
        "image": "/images/margherita.jpg",
        "available": true,
        "createdAt": "2026-03-29T10:00:00.000Z",
        "updatedAt": "2026-03-29T10:00:00.000Z",
        "__v": 0
      },
      "__v": 0
    }
  ]
}
```

#### Notes

- `menuItemId` is populated with the referenced menu item document instead of remaining just an ID.
- The response shape includes `count` and `data`.

#### Error Response

If an unexpected server error occurs while loading favorites:

- Status: `500 Internal Server Error`

```json
{
  "success": false,
  "message": "<ERROR_MESSAGE>"
}
```

### `POST /api/favorites/:menuItemId`

Toggles the favorite state for the authenticated user and the specified menu item.

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `menuItemId` | `string` | Yes | MongoDB ObjectId of the menu item to favorite or unfavorite. |

#### Request

```bash
curl -X POST http://localhost:5000/api/favorites/<MENU_ITEM_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Success Responses

When the item is not yet in favorites:

- Status: `201 Created`

```json
{
  "success": true,
  "message": "Item added to favorite."
}
```

When the item is already in favorites:

- Status: `200 OK`

```json
{
  "success": true,
  "message": "Item removed from favorite"
}
```

#### Notes

- This is a toggle endpoint, not a create-only endpoint.
- A valid ObjectId format is required.
- The controller currently validates the ID format, but it does not check whether the referenced menu item actually exists before creating the favorite.

#### Error Response

If `menuItemId` is not a valid MongoDB ObjectId:

- Status: `400 Bad Request`

```json
{
  "success": false,
  "message": "Invalid Item Id"
}
```

If an unexpected server error occurs:

- Status: `500 Internal Server Error`

```json
{
  "success": false,
  "message": "<ERROR_MESSAGE>"
}
```

### `DELETE /api/favorites/:menuItemId`

Removes a menu item from the authenticated user's favorites.

#### Path Parameters

| Name | Type | Required | Description |
| --- | --- | --- | --- |
| `menuItemId` | `string` | Yes | MongoDB ObjectId of the menu item to remove from favorites. |

#### Request

```bash
curl -X DELETE http://localhost:5000/api/favorites/<MENU_ITEM_ID> \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

#### Success Response

- Status: `200 OK`

```json
{
  "success": true,
  "message": "Item removed from favorite"
}
```

#### Notes

- Unlike `POST /api/favorites/:menuItemId`, this endpoint does not toggle.
- If the favorite entry does not exist for the current user and menu item, the endpoint returns `404`.

#### Error Responses

If `menuItemId` is not a valid MongoDB ObjectId:

- Status: `400 Bad Request`

```json
{
  "success": false,
  "message": "Invalid Item Id"
}
```

If the item is not currently in the user's favorites:

- Status: `404 Not Found`

```json
{
  "success": false,
  "message": "Item not found"
}
```

If an unexpected server error occurs:

- Status: `500 Internal Server Error`

```json
{
  "success": false,
  "message": "<ERROR_MESSAGE>"
}
```

## Common Error Handling

The favorites controllers now return JSON error responses directly from their `catch` blocks instead of forwarding errors with `next(err)`.

Current error response shape for favorites controller errors:

```json
{
  "success": false,
  "message": "<ERROR_MESSAGE>"
}
```

This applies to:

- validation errors such as an invalid `menuItemId`
- missing favorite records on `DELETE /api/favorites/:menuItemId`
- unexpected server-side failures inside the favorites controllers

Known controller error conditions:

| Condition | Status | Details |
| --- | --- | --- |
| `menuItemId` is not a valid MongoDB ObjectId | `400` | Returned by `POST /api/favorites/:menuItemId` and `DELETE /api/favorites/:menuItemId`. |
| Favorite does not exist when calling `DELETE /api/favorites/:menuItemId` | `404` | Returns `{ "success": false, "message": "Item not found" }`. |
| Unexpected server-side failure in favorites controllers | `500` | Returns `{ "success": false, "message": "<ERROR_MESSAGE>" }`. |

## Quick Usage Flow

1. Authenticate and obtain an access token.
2. Call `POST /api/favorites/<MENU_ITEM_ID>` to add a favorite.
3. Call `GET /api/favorites` to list the current user's favorites.
4. Call `DELETE /api/favorites/<MENU_ITEM_ID>` to remove a favorite explicitly.
