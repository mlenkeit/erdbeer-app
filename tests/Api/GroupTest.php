<?php
declare(strict_types=1);

namespace Tests\Api;

class GroupTest extends ApiTestCase
{
    public function testReturnsGroupInfoForValidToken(): void
    {
        $response = $this->http->get("group/{$this->token}");

        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];

        $this->assertSame($this->groupId, $data['id']);
        $this->assertSame('Testgruppe', $data['name']);
        $this->assertSame('2026-04-01', $data['season']['startDate']);
        $this->assertSame('2026-07-31', $data['season']['endDate']);
        $this->assertSame(0, $data['totalGrams']);
        $this->assertSame(0, $data['purchaseCount']);
        $this->assertNull($data['avgPricePerKgCents']);
    }

    public function testReturns404ForInvalidToken(): void
    {
        $response = $this->http->get('group/00000000000000000000000000000000');

        $this->assertSame(404, $response->getStatusCode());

        $body = json_decode($response->getBody()->getContents(), true);
        $this->assertSame('GROUP_NOT_FOUND', $body['error']['code']);
    }

    public function testReturnsGroupInfoForEndedSeason(): void
    {
        $endedSeasonId = seedSeason($this->pdo, [
            'name' => 'Alte Saison',
            'start_date' => '2025-04-01',
            'end_date' => '2025-07-31',
        ]);
        $endedToken = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
        seedGroup($this->pdo, $endedSeasonId, $endedToken, ['name' => 'Alte Gruppe']);

        $response = $this->http->get("group/{$endedToken}");

        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode($response->getBody()->getContents(), true)['data'];
        $this->assertSame('Alte Gruppe', $data['name']);
        $this->assertSame('2025-07-31', $data['season']['endDate']);
    }

    public function testStatsReflectPurchases(): void
    {
        seedPurchase($this->pdo, $this->groupId, '2026-05-10', [
            ['bagSizeGrams' => 500, 'quantity' => 2, 'priceCents' => 399, 'priceUnit' => 'kg'],
        ]);
        seedPurchase($this->pdo, $this->groupId, '2026-05-11', [
            ['bagSizeGrams' => 250, 'quantity' => 3, 'priceCents' => 249, 'priceUnit' => '500g'],
        ]);

        $response = $this->http->get("group/{$this->token}");
        $data = json_decode($response->getBody()->getContents(), true)['data'];

        $this->assertSame(2, $data['purchaseCount']);
        // 500*2 + 250*3 = 1750
        $this->assertSame(1750, $data['totalGrams']);
        $this->assertNotNull($data['avgPricePerKgCents']);
    }

    public function testRejectsNonGetMethod(): void
    {
        $response = $this->http->post("group/{$this->token}");

        $this->assertSame(405, $response->getStatusCode());
    }
}
