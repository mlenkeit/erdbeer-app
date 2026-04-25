<?php
declare(strict_types=1);

namespace Tests\Api;

class PurchaseReadTest extends ApiTestCase
{
    public function testListPurchasesEmpty(): void
    {
        $response = $this->http->get("purchases/{$this->token}");

        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];
        $this->assertSame([], $data['purchases']);
        $this->assertSame(0, $data['summary']['totalGrams']);
        $this->assertSame(0, $data['summary']['totalPriceCents']);
        $this->assertNull($data['summary']['avgPricePerKgCents']);
    }

    public function testListPurchasesWithData(): void
    {
        seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $this->groupId, '2026-05-12', [
            ['bagSizeGrams' => 250, 'quantity' => 1, 'priceCents' => 249, 'priceUnit' => '500g'],
        ]);

        $response = $this->http->get("purchases/{$this->token}");
        $data = json_decode($response->getBody()->getContents(), true)['data'];

        $this->assertCount(2, $data['purchases']);
        // Newest first
        $this->assertSame('2026-05-12', $data['purchases'][0]['purchasedAt']);
        $this->assertSame('2026-05-10', $data['purchases'][1]['purchasedAt']);

        $this->assertGreaterThan(0, $data['summary']['totalGrams']);
        $this->assertGreaterThan(0, $data['summary']['totalPriceCents']);
    }

    public function testGetSinglePurchase(): void
    {
        $purchaseId = seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->get("purchases/{$this->token}/{$purchaseId}");

        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];
        $this->assertSame($purchaseId, $data['id']);
        $this->assertSame('2026-05-10', $data['purchasedAt']);
        $this->assertCount(1, $data['items']);
        $this->assertSame(399, $data['items'][0]['pricePerKgCents']);
        $this->assertSame(1000, $data['totalGrams']);
    }

    public function testGetPurchaseIncludesUpdatedAtAfterEdit(): void
    {
        $result = $this->createPurchaseViaApi();
        $purchaseId = $result['body']['data']['id'];

        $this->http->put("purchases/{$this->token}/{$purchaseId}", [
            'json' => $this->validPurchaseBody(['purchasedAt' => '2026-05-11']),
        ]);

        $response = $this->http->get("purchases/{$this->token}/{$purchaseId}");
        $data = json_decode($response->getBody()->getContents(), true)['data'];

        $this->assertArrayHasKey('updatedAt', $data);
    }

    public function testGetNonExistentPurchase(): void
    {
        $response = $this->http->get("purchases/{$this->token}/99999");

        $this->assertSame(404, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('PURCHASE_NOT_FOUND', $body['error']['code']);
    }

    public function testGetPurchaseFromAnotherGroup(): void
    {
        $otherToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        $otherGroup = seedGroup($this->pdo, $this->seasonId, $otherToken, ['name' => 'Andere Gruppe']);
        $otherId = seedPurchase($this->pdo, $otherGroup, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 1, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);

        $response = $this->http->get("purchases/{$this->token}/{$otherId}");

        $this->assertSame(404, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('PURCHASE_NOT_FOUND', $body['error']['code']);
    }
}
