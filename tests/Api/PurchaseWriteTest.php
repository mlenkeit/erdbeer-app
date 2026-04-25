<?php
declare(strict_types=1);

namespace Tests\Api;

class PurchaseWriteTest extends ApiTestCase
{
    public function testCreatePurchase(): void
    {
        $result = $this->createPurchaseViaApi();

        $this->assertSame(201, $result['status']);

        $data = $result['body']['data'];
        $this->assertArrayHasKey('id', $data);
        $this->assertSame('2026-05-10', $data['purchasedAt']);
        $this->assertArrayHasKey('createdAt', $data);
        $this->assertCount(1, $data['items']);
        $this->assertSame(399, $data['items'][0]['pricePerKgCents']);
        $this->assertSame(1000, $data['totalGrams']);

        // Location header
        $this->assertArrayHasKey('Location', $result['headers']);
    }

    public function testCreatePurchaseWithMultipleItems(): void
    {
        $body = [
            'purchasedAt' => '2026-05-10',
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
                ['bagSizeGrams' => 250, 'quantity' => 3, 'priceCents' => 249, 'priceUnit' => '500g'],
            ],
        ];

        $result = $this->createPurchaseViaApi($body);

        $this->assertSame(201, $result['status']);

        $data = $result['body']['data'];
        $this->assertCount(2, $data['items']);
        // 500*2 + 250*3 = 1750
        $this->assertSame(1750, $data['totalGrams']);
    }

    public function testUpdatePurchase(): void
    {
        $result = $this->createPurchaseViaApi();
        $purchaseId = $result['body']['data']['id'];

        $updateBody = [
            'purchasedAt' => '2026-05-15',
            'items' => [
                ['bagSizeGrams' => 250, 'quantity' => 1, 'priceCents' => 199, 'priceUnit' => 'kg'],
            ],
        ];

        $response = $this->http->put("purchases/{$this->token}/{$purchaseId}", [
            'json' => $updateBody,
        ]);

        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];
        $this->assertSame('2026-05-15', $data['purchasedAt']);
        $this->assertCount(1, $data['items']);
        $this->assertSame(250, $data['items'][0]['bagSizeGrams']);
        $this->assertSame(250, $data['totalGrams']);
    }

    public function testDeletePurchase(): void
    {
        $result = $this->createPurchaseViaApi();
        $purchaseId = $result['body']['data']['id'];

        $response = $this->http->delete("purchases/{$this->token}/{$purchaseId}");

        $this->assertSame(204, $response->getStatusCode());
        $this->assertSame('', $response->getBody()->getContents());

        // Verify it's gone
        $getResponse = $this->http->get("purchases/{$this->token}/{$purchaseId}");
        $this->assertSame(404, $getResponse->getStatusCode());
    }

    public function testDeleteCascadesItems(): void
    {
        $result = $this->createPurchaseViaApi();
        $purchaseId = $result['body']['data']['id'];

        $this->http->delete("purchases/{$this->token}/{$purchaseId}");

        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM purchase_items WHERE purchase_id = ?');
        $stmt->execute([$purchaseId]);
        $this->assertSame(0, (int) $stmt->fetchColumn());
    }

    public function testCreateOnEndedSeason(): void
    {
        $endedSeasonId = seedSeason($this->pdo, [
            'name' => 'Alte Saison',
            'start_date' => '2025-04-01',
            'end_date' => '2025-07-31',
        ]);
        $endedToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        seedGroup($this->pdo, $endedSeasonId, $endedToken, ['name' => 'Alte Gruppe']);

        $response = $this->http->post("purchases/{$endedToken}", [
            'json' => [
                'purchasedAt' => '2025-05-10',
                'items' => [
                    ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
                ],
            ],
        ]);

        $this->assertSame(403, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('SEASON_ENDED', $body['error']['code']);
    }

    public function testUpdateOnEndedSeason(): void
    {
        $endedSeasonId = seedSeason($this->pdo, [
            'name' => 'Alte Saison',
            'start_date' => '2025-04-01',
            'end_date' => '2025-07-31',
        ]);
        $endedToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $endedGroupId = seedGroup($this->pdo, $endedSeasonId, $endedToken, ['name' => 'Alte Gruppe']);
        $purchaseId = seedPurchase($this->pdo, $endedGroupId, '2025-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->put("purchases/{$endedToken}/{$purchaseId}", [
            'json' => [
                'purchasedAt' => '2025-05-11',
                'items' => [
                    ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
                ],
            ],
        ]);

        $this->assertSame(403, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('SEASON_ENDED', $body['error']['code']);
    }

    public function testDeleteOnEndedSeason(): void
    {
        $endedSeasonId = seedSeason($this->pdo, [
            'name' => 'Alte Saison',
            'start_date' => '2025-04-01',
            'end_date' => '2025-07-31',
        ]);
        $endedToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $endedGroupId = seedGroup($this->pdo, $endedSeasonId, $endedToken, ['name' => 'Alte Gruppe']);
        $purchaseId = seedPurchase($this->pdo, $endedGroupId, '2025-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->delete("purchases/{$endedToken}/{$purchaseId}");

        $this->assertSame(403, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('SEASON_ENDED', $body['error']['code']);
    }

    public function testUpdatePurchaseFromAnotherGroup(): void
    {
        $otherToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $otherGroup = seedGroup($this->pdo, $this->seasonId, $otherToken, ['name' => 'Andere Gruppe']);
        $otherId = seedPurchase($this->pdo, $otherGroup, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->put("purchases/{$this->token}/{$otherId}", [
            'json' => $this->validPurchaseBody(),
        ]);

        $this->assertSame(404, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('PURCHASE_NOT_FOUND', $body['error']['code']);
    }

    public function testDeletePurchaseFromAnotherGroup(): void
    {
        $otherToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $otherGroup = seedGroup($this->pdo, $this->seasonId, $otherToken, ['name' => 'Andere Gruppe']);
        $otherId = seedPurchase($this->pdo, $otherGroup, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->delete("purchases/{$this->token}/{$otherId}");

        $this->assertSame(404, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('PURCHASE_NOT_FOUND', $body['error']['code']);
    }

    public function testComputedPricePerKgCents(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => '500g'],
            ],
        ]);

        $result = $this->createPurchaseViaApi($body);
        $data = $result['body']['data'];

        // priceCents=399 for 500g → per kg = round(399 * 1000 / 500) = 798
        $this->assertSame(798, $data['items'][0]['pricePerKgCents']);
    }

    public function testComputedTotalGrams(): void
    {
        $body = [
            'purchasedAt' => '2026-05-10',
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
                ['bagSizeGrams' => 250, 'quantity' => 3, 'priceCents' => 249, 'priceUnit' => '500g'],
            ],
        ];

        $result = $this->createPurchaseViaApi($body);
        // 500*2 + 250*3 = 1750
        $this->assertSame(1750, $result['body']['data']['totalGrams']);
    }

    public function testComputedTotalPriceCents(): void
    {
        $body = $this->validPurchaseBody([
            'items' => [
                ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
            ],
        ]);

        $result = $this->createPurchaseViaApi($body);
        // round(399 * 500 / 1000) * 2 = 200 * 2 = 400
        $this->assertSame(400, $result['body']['data']['totalPriceCents']);
    }
}
